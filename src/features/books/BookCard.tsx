import Link from "next/link";
import { type BookRecord, syntheticMarker } from "@/src/core/books/entities";
import { SyntheticBadge } from "./SyntheticBadge";

function authorList(authors: unknown): string {
  return Array.isArray(authors) ? authors.join(", ") : "Unknown";
}

export function BookCard({ book }: { book: BookRecord }) {
  const marker = syntheticMarker(book);

  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="min-w-0 break-words font-medium leading-snug">
            <Link href={`/books/${book.slug}`} className="hover:underline">
              {book.title}
            </Link>
          </h3>
          {/* Adjacent to the title, always rendered — never behind a toggle. */}
          {marker && <SyntheticBadge className="mt-1.5" />}
        </div>
        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
          {book.trustScore}
        </span>
      </div>

      <p className="mt-2 break-words text-sm text-slate-400">
        {authorList(book.authors)}
        {book.year ? ` · ${book.year}` : ""}
      </p>

      {book.description && (
        <p className="mt-3 line-clamp-3 text-sm text-slate-500">{book.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded border border-slate-800 px-2 py-0.5">{book.source}</span>
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
  );
}
