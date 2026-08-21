import { parseBook } from "./parser";
import { semanticChunk } from "./chunker";
import { getEmbeddingProvider } from "../embeddings/factory";
import { db } from "@/src/db/client";
import {
  books as booksTable,
  chapters as chaptersTable,
  chunks as chunksTable,
} from "@/src/db/schema";
import { encodingForModel } from "js-tiktoken";
import { sql } from "drizzle-orm";

const enc = encodingForModel("gpt-3.5-turbo");

interface IngestionOptions {
  generateSummaries?: boolean;
  batchSize?: number;
}

export async function ingestBook(
  filePath: string,
  slug: string,
  options: IngestionOptions = {}
) {
  const { batchSize = 100 } = options;

  console.log(`📚 Starting ingestion for: ${filePath}`);

  const parsed = await parseBook(filePath);
  console.log(`✓ Parsed book: "${parsed.title}"`);

  const insertedBook = await db
    .insert(booksTable)
    .values({
      slug,
      title: parsed.title,
      authors: parsed.authors,
      description: "",
      language: "en",
      source: "public_domain",
      license: "public_domain",
      tokensTotal: 0,
      chaptersCount: parsed.chapters.length,
      trustScore: "8.0" as any,
    })
    .returning();

  const bookId = insertedBook[0].id;
  console.log(`✓ Inserted book with ID: ${bookId}`);

  let totalTokens = 0;
  let chunkCount = 0;

  if (parsed.chapters.length > 0) {
    for (let i = 0; i < parsed.chapters.length; i++) {
      const chap = parsed.chapters[i];

      const insertedChapter = await db
        .insert(chaptersTable)
        .values({
          bookId,
          order: i + 1,
          title: chap.title,
          summary: "",
        })
        .returning();

      const chapterId = insertedChapter[0].id;

      const chunks = await semanticChunk(chap.content);

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j];
        await db.insert(chunksTable).values({
          bookId,
          chapterId,
          order: j + 1,
          content: chunk.content,
          tokens: chunk.tokens,
        });

        totalTokens += chunk.tokens;
        chunkCount++;
      }
    }
  } else {
    const chunks = await semanticChunk(parsed.content);

    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j];
      await db.insert(chunksTable).values({
        bookId,
        chapterId: null,
        order: j + 1,
        content: chunk.content,
        tokens: chunk.tokens,
      });

      totalTokens += chunk.tokens;
      chunkCount++;
    }
  }

  console.log(`✓ Created ${chunkCount} chunks with ${totalTokens} total tokens`);

  console.log(`🧠 Embedding ${chunkCount} chunks...`);
  const provider = await getEmbeddingProvider();

  const allChunks = await db.query.chunks.findMany({
    where: (chunksCol: any, { eq }: any) => eq(chunksCol.bookId, bookId),
  });

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const texts = batch.map((c: any) => c.content);

    try {
      const embeddings = await provider.embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        const embedding = embeddings[j];
        await db.execute(
          sql`UPDATE chunks SET embedding = ${JSON.stringify(embedding)}::vector WHERE id = ${batch[j].id}`
        );
      }

      console.log(
        `✓ Embedded chunks ${i + 1}-${Math.min(i + batchSize, allChunks.length)}`
      );
    } catch (error) {
      console.error(
        `❌ Error embedding batch ${Math.floor(i / batchSize) + 1}:`,
        error
      );
      throw error;
    }
  }

  await db
    .update(booksTable)
    .set({ tokensTotal: totalTokens })
    .where((t: any) => t.id === bookId);

  console.log(
    `✅ Ingestion complete! Book ID: ${bookId}, Total tokens: ${totalTokens}`
  );
  return { bookId, chunkCount, totalTokens };
}
