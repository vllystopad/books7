import { notFound } from "next/navigation";
import { BookDetailView } from "@/src/features/books/BookDetailView";
import { getBookBySlug } from "@/src/features/books/queries";

export const revalidate = 3600; // Cache for 1 hour

/** Server component: fetches on the server, renders the client view. */
export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const book = await getBookBySlug(slug);
  if (!book) notFound();

  return <BookDetailView book={book} />;
}
