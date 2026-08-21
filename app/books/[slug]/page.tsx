import { redirect } from "next/navigation";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export const revalidate = 3600; // Cache for 1 hour

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;

  // Validate slug format
  if (!slug || typeof slug !== "string") {
    redirect("/");
  }

  // Query book from database
  let book;
  try {
    const result = await db
      .select()
      .from(books)
      .where(eq(books.slug, slug))
      .limit(1);
    
    book = result[0];
  } catch (error) {
    // Database error or connection issue
    console.error("Error fetching book:", error);
    redirect("/");
  }

  // Redirect if book doesn't exist
  if (!book) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
        <p className="text-slate-400 font-mono text-sm mb-4">{slug}</p>
        <p className="text-slate-300">
          {book.description || "No description available"}
        </p>
        <div className="mt-8 text-slate-500">
          <p>Authors: {(book.authors as string[]).join(", ") || "Unknown"}</p>
          <p>Source: {book.source}</p>
          <p>License: {book.license || "Unknown"}</p>
        </div>
      </div>
    </main>
  );
}
