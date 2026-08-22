import { NextRequest, NextResponse } from "next/server";
import { searchBooks } from "@/src/mcp/tools/search-books";

/** Web-facing search. Shares the search-books use case with the MCP tool so the
 *  UI and agent clients cannot return different results for the same query. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("q")?.trim() ?? "";

  if (!topic) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(10, Math.max(1, Math.trunc(rawLimit)))
    : 5;

  return NextResponse.json(await searchBooks(topic, limit));
}
