import * as path from "path";
import { ingestBook } from "../src/core/ingestion/processor";

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error("Usage: pnpm ingest <file-path> [--slug <slug>]");
  console.error("\nExample:");
  console.error("  pnpm ingest ./books/my-book.txt --slug author/book-title");
  process.exit(1);
}

const filePath = args[0];
const slugIndex = args.indexOf("--slug");
const slug =
  slugIndex !== -1 ? args[slugIndex + 1] : deriveSlug(filePath);

function deriveSlug(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  return `unknown/${fileName.toLowerCase().replace(/\s+/g, "-")}`;
}

async function main() {
  console.log(`📖 Ingesting: ${filePath}`);
  console.log(`📌 Slug: ${slug}\n`);

  try {
    await ingestBook(filePath, slug);
    console.log("\n✅ Success!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
