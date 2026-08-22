import { BooksList } from "@/src/features/books/BooksList";
import { getLibrary } from "@/src/features/books/queries";
import { ChatWindow } from "@/src/features/chat/ChatWindow";

export default async function Home() {
  const library = await getLibrary();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <header className="mb-10 sm:mb-14">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Books7</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Context7 for books — grounded, attributable book context over MCP.
          </p>
        </header>

        {/* Section 1 — Resources */}
        <section className="mb-14 sm:mb-20">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-semibold sm:text-xl">Resources</h2>
            <span className="text-xs text-slate-500 sm:text-sm">
              {library.length} {library.length === 1 ? "book" : "books"} indexed
            </span>
          </div>

          <BooksList books={library} />
        </section>

        {/* Section 2 — Agent console */}
        <section>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-semibold sm:text-xl">Agent console</h2>
            <span className="text-xs text-slate-500 sm:text-sm">gpt-4o-mini</span>
          </div>
          <p className="mb-6 text-sm text-slate-500">
            Chat on the left. On the right, the exact JSON the agent receives — tool
            schemas, resources, prompts, and every call and result as it happens.
          </p>
          <ChatWindow />
        </section>
      </div>
    </main>
  );
}
