import * as fs from "fs";
import * as path from "path";
import { marked } from "marked";

export interface ParsedBook {
  title: string;
  authors: string[];
  content: string;
  chapters: Array<{ title: string; content: string }>;
}

export async function parseBook(filePath: string): Promise<ParsedBook> {
  const ext = path.extname(filePath).toLowerCase();
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  switch (ext) {
    case ".md":
    case ".markdown":
      return parseMarkdown(fullPath);
    case ".txt":
      return parseText(fullPath);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

function parseMarkdown(filePath: string): ParsedBook {
  const content = fs.readFileSync(filePath, "utf-8");
  const title = "Parsed Markdown";
  const authors: string[] = [];

  const chapters: Array<{ title: string; content: string }> = [];
  const parts = content.split(/^# /m);

  parts.forEach((part, idx) => {
    if (idx === 0 && part.trim().length === 0) return;

    const lines = part.split("\n");
    const chapterTitle = lines[0] || `Chapter ${idx}`;
    const chapterContent = lines.slice(1).join("\n").trim();

    if (chapterContent.length > 0) {
      chapters.push({ title: chapterTitle, content: chapterContent });
    }
  });

  return {
    title,
    authors,
    content,
    chapters: chapters.length > 0 ? chapters : [],
  };
}

function parseText(filePath: string): ParsedBook {
  const content = fs.readFileSync(filePath, "utf-8");
  const title = path.basename(filePath, ".txt");
  const authors: string[] = [];

  return {
    title,
    authors,
    content,
    chapters: [],
  };
}
