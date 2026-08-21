# Books7

Context7 for books — accurate, topic-scoped context over MCP for business non-fiction, science writing, and fiction.

## What This Is

Books7 provides an MCP (Model Context Protocol) server that lets Claude and other AI agents query a library of books semantically. Instead of hallucinating book content, agents can:

1. **Resolve** a book by title, author, or topic ("find a book about unit economics")
2. **Get context** from a book — hybrid search (BM25 + vector) with snippets, chapter summaries, and proper attribution
3. **Search across books** — "what do different authors say about delegation?"

## Stack

- **Next.js 15** (App Router, RSC)
- **Drizzle ORM** + **PostgreSQL** with **pgvector**
- **Embeddings**: OpenAI (text-embedding-3-small) or local (@xenova/transformers)
- **MCP**: @modelcontextprotocol/sdk via route handlers
- **Tailwind CSS v4** + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension (or Neon)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

#### Option A: Local PostgreSQL with Docker

```bash
docker-compose up -d
```

This starts a Postgres 17 instance with pgvector already enabled.

#### Option B: Neon (Serverless)

1. Create a Neon project at https://console.neon.tech
2. Enable the pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Copy the connection string

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set `NEXT_APP_DATABASE_URL`:

```bash
# Local
NEXT_APP_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/books7

# Or Neon
NEXT_APP_DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname
```

Optionally set `NEXT_APP_OPENAI_API_KEY` for embeddings (falls back to local if not set):

```bash
NEXT_APP_OPENAI_API_KEY=sk-...
```

### 4. Run Migrations

```bash
npx drizzle-kit push
```

### 5. Seed Public Domain Books (Optional)

Download and ingest 4 public-domain books from Project Gutenberg:

```bash
npm run seed
```

This downloads:
- The Art of War
- The Adventures of Sherlock Holmes
- The Picture of Dorian Gray
- A Tale of Two Cities

Books are chunked (~800 tokens), embedded, and stored in the database.

### 6. Start Dev Server

```bash
npm run dev
```

Navigate to http://localhost:3000

## Ingesting Books

To ingest a custom book:

```bash
npm run ingest <path/to/book.txt> --slug author-name/book-title
```

Supported formats: `.txt`, `.md`, `.epub` (limited), `.pdf` (limited)

## MCP Server

The MCP endpoint is `/api/mcp` (HTTP POST with Streamable transport).

### Add to Claude Code

```bash
claude mcp add --transport http books7 http://localhost:3000/api/mcp
```

Or manually in `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "books7": {
      "command": "npx",
      "args": ["http-connector", "http://localhost:3000/api/mcp"],
      "transport": "http"
    }
  }
}
```

### Available Tools

1. **`resolve-book-id`** — Find books by title, author, or topic
   - Input: `{ query: string }`
   - Output: List of candidates with ID, title, authors, snippet count, trust score

2. **`get-book-context`** — Get snippets from a book
   - Input: `{ bookId: string, topic?: string, tokens?: number (default 5000), mode?: 'snippets' | 'outline' }`
   - Output: Plain text with snippets, attribution, license

3. **`search-books`** — Search across all books
   - Input: `{ topic: string, limit?: number }`
   - Output: Snippets from multiple books with source attribution

## Database Schema

```sql
-- Books
- id, slug, title, authors (JSON), description, cover_url
- language, year, source (public_domain | user_upload | summary)
- license, tokens_total, chapters_count, trust_score, created_at

-- Chapters
- id, book_id, order, title, summary

-- Chunks (indexed for search)
- id, book_id, chapter_id, order, content, tokens
- embedding (vector(1536)), created_at

-- Topics (many-to-many with books)
- id, name, description
```

Indexes:
- HNSW on `embedding` (cosine distance)
- GIN on `tsv` (full-text search, future)
- btree on `slug`, `source`, `book_id`, `chapter_id`

## Architecture

```
src/
  app/              # Next.js pages and API routes
  core/             # Domain logic (books, search, ingestion, embeddings)
  mcp/              # MCP tools
  components/       # React components
  db/               # Drizzle schema, migrations, client
  lib/              # Utilities, config, constants
  types/            # Shared types
```

Domain layer (`core/`) is Next.js-agnostic — business logic stays separate from HTTP/MCP adapters.

## Legal Boundary

- **Full texts** are never stored for copyrighted books
- **Public domain** books: any snippet is allowed
- **User uploads**: visible only to uploader
- **Summaries**: our condensed notes, not original text
- **Output cap**: max 5% of a book per session
- **Attribution**: every snippet carries source and license

## Development

### Run dev server with auto-reload

```bash
npm run dev
```

### Type check

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Query database

```bash
npx drizzle-kit studio
```

Opens a local web UI for browsing data.

## Performance

- **Vector search**: HNSW index (16 neighbors, 64 construction factor)
- **Full-text search**: GIN index on tsvector (future)
- **Hybrid fusion**: Reciprocal Rank Fusion (RRF) with configurable weights
- **Chunking**: Semantic by paragraph, ~800 tokens, 100-token overlap
- **Embedding**: Batched (100 chunks/batch) with retry logic

## Future

- [ ] Chapter summaries via LLM
- [ ] Author/topic filtering in search
- [ ] Rate limiting per IP/API key
- [ ] User uploads with access control
- [ ] PDF and EPUB parsing (current: text-only)
- [ ] Highlight search matches in UI
- [ ] Dark mode (already CSS-ready)

## Support

For issues, check:
1. `.env` has `NEXT_APP_DATABASE_URL` and points to a running database
2. `docker-compose ps` shows postgres is healthy (if using Docker)
3. Migrations ran: `npx drizzle-kit push`
4. Logs: `npm run dev` shows any startup errors

---

**Built with ❤️ using Next.js, Drizzle, PostgreSQL, and pgvector**
