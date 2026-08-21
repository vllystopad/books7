import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { ingestBook } from "../src/core/ingestion/processor";

const GUTENBERG_BOOKS = [
  {
    id: 4300,
    title: "The Art of War",
    slug: "sun-tzu/art-of-war",
    url: "https://www.gutenberg.org/cache/epub/4300/pg4300.txt",
  },
  {
    id: 1661,
    title: "The Adventures of Sherlock Holmes",
    slug: "arthur-conan-doyle/sherlock-holmes",
    url: "https://www.gutenberg.org/cache/epub/1661/pg1661.txt",
  },
  {
    id: 174,
    title: "The Picture of Dorian Gray",
    slug: "oscar-wilde/dorian-gray",
    url: "https://www.gutenberg.org/cache/epub/174/pg174.txt",
  },
  {
    id: 98,
    title: "A Tale of Two Cities",
    slug: "charles-dickens/tale-of-two-cities",
    url: "https://www.gutenberg.org/cache/epub/98/pg98.txt",
  },
];

function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(filePath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
  });
}

async function main() {
  console.log("🌱 Starting seed process...\n");

  const booksDir = path.join(process.cwd(), "data", "books");

  for (const book of GUTENBERG_BOOKS) {
    console.log(`\n📖 Processing: ${book.title}`);

    const filePath = path.join(booksDir, `${book.slug.replace("/", "-")}.txt`);

    // Download if not exists
    if (!fs.existsSync(filePath)) {
      console.log(`  ⬇️  Downloading from Project Gutenberg...`);
      try {
        await downloadFile(book.url, filePath);
        console.log(`  ✓ Downloaded`);
      } catch (error) {
        console.error(`  ❌ Download failed:`, error);
        continue;
      }
    } else {
      console.log(`  ✓ Already downloaded`);
    }

    // Ingest
    try {
      const result = await ingestBook(filePath, book.slug);
      console.log(
        `  ✅ Ingested: ${result.chunkCount} chunks, ${result.totalTokens} tokens`
      );
    } catch (error) {
      console.error(`  ❌ Ingestion failed:`, error);
    }
  }

  console.log("\n🎉 Seed complete!");
}

main().catch(console.error);
