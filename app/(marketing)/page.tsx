import { desc } from "drizzle-orm";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import { AgentConsole } from "./_components/agent-console";

type BookRow = typeof books.$inferSelect;

function authorList(authors: unknown): string {
  return Array.isArray(authors) ? authors.join(", ") : "Unknown";
}

async function getLibrary(): Promise<BookRow[]> {
  return db.select().from(books).orderBy(desc(books.trustScore));
}

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

          {library.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
              No books yet. Seed the database to populate this section.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {library.map((book) => (
                <li
                  key={book.id}
                  className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words font-medium leading-snug">
                      {book.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {book.trustScore}
                    </span>
                  </div>

                  <p className="mt-1 break-words text-sm text-slate-400">
                    {authorList(book.authors)}
                    {book.year ? ` · ${book.year}` : ""}
                  </p>

                  {book.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-500">
                      {book.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded border border-slate-800 px-2 py-0.5">
                      {book.source}
                    </span>
                    {book.license && (
                      <span className="rounded border border-slate-800 px-2 py-0.5">
                        {book.license}
                      </span>
                    )}
                    <span className="rounded border border-slate-800 px-2 py-0.5">
                      {book.chaptersCount} ch
                    </span>
                    <span className="rounded border border-slate-800 px-2 py-0.5">
                      {book.tokensTotal.toLocaleString()} tokens
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
          <AgentConsole />
        </section>
      </div>
    </main>
  );
}
