import { desc } from "drizzle-orm";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import type { BookRow } from "./BookCard";

/** Catalogue read for the web UI, ordered by trust score. */
export async function getLibrary(): Promise<BookRow[]> {
  return db.select().from(books).orderBy(desc(books.trustScore));
}
