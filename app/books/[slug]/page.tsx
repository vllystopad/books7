import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSynthetic } from "@/src/core/books/entities";
import { BookDetailView } from "@/src/features/books/BookDetailView";
import { getBookBySlug } from "@/src/features/books/queries";
import { SITE_URL } from "@/src/lib/constants";

export const revalidate = 3600; // Cache for 1 hour

const AI_TITLE_SUFFIX = " [AI-generated]";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);

  if (!book) return { title: "Book not found" };

  const synthetic = isSynthetic(book);
  const title = synthetic ? `${book.title}${AI_TITLE_SUFFIX}` : book.title;

  return {
    title,
    description: book.description ?? undefined,
    // Fabricated works must not enter search indexes or be followed outward.
    robots: synthetic
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description: book.description ?? undefined,
      url: `${SITE_URL}/books/${book.slug}`,
      type: "article",
    },
  };
}

/** Server component: fetches on the server, renders the client view. */
export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const synthetic = isSynthetic(book);

  // schema.org Book markup feeds knowledge panels and bibliographic
  // aggregators. Valid markup on a fabricated work can propagate into external
  // databases as though the book were real, so it is omitted entirely rather
  // than emitted with a modified field.
  const jsonLd = synthetic
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Book",
        name: book.title,
        author: (Array.isArray(book.authors) ? book.authors : []).map((n) => ({
          "@type": "Person",
          name: String(n),
        })),
        datePublished: book.year ? String(book.year) : undefined,
        inLanguage: book.language,
        license: book.license ?? undefined,
        url: `${SITE_URL}/books/${book.slug}`,
      };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BookDetailView book={book} />
    </>
  );
}
