"use client";

import { isSynthetic, type BookRecord } from "@/src/core/books/entities";
import { ChatWindow } from "@/src/features/chat/ChatWindow";
import { BooksList } from "./BooksList";
import { SyntheticFilter } from "./SyntheticFilter";

/** Client view for the catalogue. Data is fetched on the server and handed
 *  down as props — nothing here touches the database. */
export function CatalogueView({
  books,
  hideSynthetic,
}: {
  books: BookRecord[];
  hideSynthetic: boolean;
}) {
  const syntheticCount = books.filter(isSynthetic).length;
  const visible = hideSynthetic ? books.filter((b) => !isSynthetic(b)) : books;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <header className="mb-10 sm:mb-14">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Books7</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Context7 for books — grounded, attributable book context over MCP.
          </p>
        </header>

        {/* Agent console first — the demo leads, the catalogue supports it. */}
        <section className="mb-14 sm:mb-20">
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

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-semibold sm:text-xl">Resources</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs text-slate-500 sm:text-sm">
                {visible.length} {visible.length === 1 ? "book" : "books"}
              </span>
              <SyntheticFilter
                hideSynthetic={hideSynthetic}
                syntheticCount={syntheticCount}
              />
            </div>
          </div>

          <BooksList books={visible} />
        </section>
      </div>
    </main>
  );
}
