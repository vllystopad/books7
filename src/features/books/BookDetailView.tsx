"use client";

import Link from "next/link";
import { syntheticMarker, type BookRecord } from "@/src/core/books/entities";
import { SyntheticBadge } from "./SyntheticBadge";
import { SyntheticNotice } from "./SyntheticNotice";

function authorList(authors: unknown): string {
  return Array.isArray(authors) ? authors.join(", ") : "Unknown";
}

/** Client view for one book. The record is fetched on the server and passed in. */
export function BookDetailView({ book }: { book: BookRecord }) {
  const marker = syntheticMarker(book);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Catalogue
        </Link>

        <header className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {book.title}
          </h1>
          {/* Adjacent to the title, above the fold, no interaction required. */}
          {marker && <SyntheticBadge className="mt-2" />}
          <p className="mt-2 font-mono text-xs text-slate-500">{book.slug}</p>
        </header>

        {/* Full disclosure sits above the description, never below it. */}
        {marker && (
          <div className="mt-6">
            <SyntheticNotice marker={marker} />
          </div>
        )}

        <p className="mt-6 text-slate-300">
          {book.description || "No description available"}
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-800 pt-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Authors</dt>
            <dd className="mt-0.5 break-words text-slate-300">
              {authorList(book.authors)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Year</dt>
            <dd className="mt-0.5 text-slate-300">{book.year ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Source</dt>
            <dd className="mt-0.5 text-slate-300">{book.source}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">License</dt>
            <dd className="mt-0.5 text-slate-300">{book.license ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Chapters</dt>
            <dd className="mt-0.5 text-slate-300">{book.chaptersCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tokens</dt>
            <dd className="mt-0.5 text-slate-300">
              {book.tokensTotal.toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
