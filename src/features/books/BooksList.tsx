import type { BookRecord } from "@/src/core/books/entities";
import { BookCard } from "./BookCard";

export function BooksList({ books }: { books: BookRecord[] }) {
  if (books.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
        No books match the current filter.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </ul>
  );
}
