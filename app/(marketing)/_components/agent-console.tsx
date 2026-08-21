"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { JsonBlock } from "./json-block";

type Message = { role: "user" | "assistant"; content: string };

type Activity =
  | { kind: "call"; id: string; name: string; arguments: unknown }
  | { kind: "result"; id: string; name: string; result: unknown };

type Handshake = {
  model: string;
  systemPrompt: string;
  tools: unknown[];
  prompts: unknown[];
  resources: unknown[];
  messages: unknown[];
};

type Tab = "activity" | "tools" | "resources" | "prompts" | "system";

const TABS: { id: Tab; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "tools", label: "Tools" },
  { id: "resources", label: "Resources" },
  { id: "prompts", label: "Prompts" },
  { id: "system", label: "System" },
];

const SUGGESTIONS = [
  "What books do you have?",
  "Find the book about the whale",
  "What does the library say about evolution?",
];

export function AgentConsole() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>("activity");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    setActivity([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantOpen = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let event: any;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "handshake") {
            setHandshake(event.payload);
          } else if (event.type === "tool_call") {
            setTab("activity");
            setActivity((a) => [
              ...a,
              { kind: "call", id: event.id, name: event.name, arguments: event.arguments },
            ]);
          } else if (event.type === "tool_result") {
            setActivity((a) => [
              ...a,
              { kind: "result", id: event.id, name: event.name, result: event.result },
            ]);
          } else if (event.type === "token") {
            if (!assistantOpen) {
              assistantOpen = true;
              setMessages((m) => [...m, { role: "assistant", content: event.text }]);
            } else {
              setMessages((m) => {
                const copy = [...m];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: last.content + event.text,
                };
                return copy;
              });
            }
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(input);
  }

  const paneContent =
    tab === "activity" ? (
      activity.length === 0 ? (
        <Empty>
          Tool calls appear here as the agent makes them. Ask something to see the
          exchange.
        </Empty>
      ) : (
        <div className="space-y-3">
          {activity.map((a, i) => (
            <div
              key={`${a.id}-${a.kind}-${i}`}
              className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/60"
            >
              <div className="flex min-w-0 items-center gap-2 border-b border-slate-800 px-2 py-1.5 sm:px-3">
                <span
                  className={
                    a.kind === "call"
                      ? "shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-sky-300"
                      : "shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-emerald-300"
                  }
                >
                  {a.kind === "call" ? "→ call" : "← result"}
                </span>
                <span className="truncate font-mono text-[11px] text-slate-300">
                  {a.name}
                </span>
              </div>
              <div className="min-w-0 px-2 py-2 sm:px-3">
                <JsonBlock value={a.kind === "call" ? a.arguments : a.result} />
              </div>
            </div>
          ))}
        </div>
      )
    ) : !handshake ? (
      <Empty>Send a message to load the agent handshake.</Empty>
    ) : tab === "tools" ? (
      <JsonBlock value={handshake.tools} />
    ) : tab === "resources" ? (
      <JsonBlock value={handshake.resources} />
    ) : tab === "prompts" ? (
      <JsonBlock value={handshake.prompts} />
    ) : (
      <JsonBlock value={{ model: handshake.model, systemPrompt: handshake.systemPrompt }} />
    );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Left — chat. min-w-0 lets the column shrink below its content width. */}
      <div className="flex h-[26rem] min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/50 sm:h-[30rem] lg:h-[34rem]">
        <div className="shrink-0 border-b border-slate-800 px-3 py-2.5 text-xs font-medium text-slate-400 sm:px-4">
          Chat
        </div>

        <div
          ref={scrollRef}
          className="min-w-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-slate-400">Ask about the books in the library.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void submit(s)}
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[90%] overflow-hidden rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-sm break-words hyphens-auto text-white sm:max-w-[85%] sm:px-4"
                    : "max-w-[90%] overflow-hidden rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2 text-sm break-words hyphens-auto whitespace-pre-wrap text-slate-100 sm:max-w-[85%] sm:px-4"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {busy && (
            <p className="text-xs text-slate-500">
              {activity.length > 0 ? "Running tools…" : "Thinking…"}
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex shrink-0 gap-2 border-t border-slate-800 p-2 sm:p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a book…"
            disabled={busy}
            className="w-full min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-slate-500 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
          >
            Send
          </button>
        </form>
      </div>

      {/* Right — what the agent receives */}
      <div className="flex h-[26rem] min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/50 sm:h-[30rem] lg:h-[34rem]">
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white"
                  : "shrink-0 rounded-md px-2.5 py-1 text-xs whitespace-nowrap text-slate-400 transition hover:text-slate-200"
              }
            >
              {t.label}
              {t.id === "activity" && activity.length > 0 && (
                <span className="ml-1.5 text-[10px] text-sky-400">{activity.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto p-2 font-mono sm:p-3">
          {paneContent}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="font-sans text-xs text-slate-500">{children}</p>
    </div>
  );
}
