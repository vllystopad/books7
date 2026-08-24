# Books7 — an MCP server exposing a searchable book corpus to LLM agents

Books7 serves token-budgeted, attributed book excerpts to LLM clients over the Model Context
Protocol, so an agent can ground answers in retrieved passages instead of recalling them.

## Highlights

- **Built an MCP server exposing a book corpus to LLM clients** — tools, resources, and prompts
  assembled from a single registry, returning token-budgeted excerpts with mandatory attribution
  (Next.js 16 route handlers, PostgreSQL, Drizzle ORM).
- **Designed structured failure semantics so calling models can distinguish "no data" from "no
  answer".** Every content tool returns a typed outcome label — `BOOK_NOT_IN_CORPUS`,
  `BOOK_NOT_INGESTED`, `NO_MATCH_FOR_TOPIC`, `CAPPED` — on the first line of the response, each
  carrying at least one concrete next action. This replaced empty results that caused clients to
  emit filler instead of reporting the gap.
- **Added a self-describing corpus resource** generated from live database counts, including an
  explicit list of what the corpus does *not* contain, so clients stop inventing capabilities from
  tool names. Exposed as both a resource and a tool, because some MCP clients are tools-only.
- **Enforced AI-content transparency per EU AI Act Art. 50 across four layers** — a database CHECK
  constraint making an unmarked synthetic row impossible to insert, UI badges and disclosure
  callouts, `noindex` plus omitted schema.org `Book` markup, and warning-wrapped MCP tool output —
  all formatted from one domain predicate so the layers cannot drift apart.
- **Built a document ingestion pipeline** — EPUB/PDF/text parsing, semantic chunking (~800 tokens
  with overlap), and a batched embedding provider with an OpenAI or local `@xenova/transformers`
  backend.
- **Modelled a synthetic evaluation corpus** whose authors deliberately contradict one another
  within topic clusters, so retrieval can be tested against known disagreement rather than
  paraphrases of a single position.

## Current status

This is a working prototype, not a production service. Accurate as of the latest commit:

| Area | State |
|---|---|
| Retrieval | **Lexical only** — PostgreSQL `ts_rank` over `to_tsvector`. Not BM25. |
| Embeddings | Provider code exists; `chunks` has **no `embedding` column**, so vector search is unavailable and semantic queries that share no vocabulary with the text will miss. |
| Corpus | 25 catalogue records, **all AI-generated demo data**. 6 are ingested and readable; 19 are metadata-only. No real public-domain works are currently indexed. |
| Topic taxonomy | Not generated. The corpus resource reports its absence rather than inferring categories. |
| Tests | None yet. |

`describe_corpus` reports all of the above from live database state, so an agent is told these
limits rather than discovering them by failing.

## Stack

- **Next.js 16** (App Router, React Server Components)
- **PostgreSQL** (Neon) + **Drizzle ORM**
- **Zod** for tool-argument validation
- **Tailwind CSS v4**
- **OpenAI** SDK for chat and embeddings; `@xenova/transformers` for local embeddings
- MCP surface implemented directly over Next.js route handlers — no MCP SDK dependency

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL 15+ database ([Neon](https://console.neon.tech) works well)

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set the connection string:

```bash
NEXT_APP_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Optionally set an OpenAI key for the agent console and embeddings:

```bash
NEXT_APP_OPENAI_API_KEY=sk-...
```

`.env` is gitignored. Never commit it.

### 3. Run migrations

Migrations are plain SQL in `src/db/migrations/`, applied in filename order:

```
001_init.sql                  schema
002_synthetic_provenance.sql  AI provenance columns + CHECK constraint
```

Apply them with `psql`, the Neon SQL editor, or your migration tool of choice.

### 4. Start

```bash
npm run dev
```

Open http://localhost:3000. The landing page has an agent console that shows the exact JSON the
model receives — tool schemas, resources, prompts, and every tool call and result as it happens.

## MCP surface

Endpoint: `POST /api/mcp/http`

```bash
curl -X POST http://localhost:3000/api/mcp/http \
  -H 'Content-Type: application/json' \
  -d '{"method":"tools/list"}'
```

Supported methods: `tools/list`, `tools/call`, `resources/list`, `prompts/list`, `prompts/get`.
`GET /api/mcp/http` returns a discovery document.

### Tools

| Tool | Purpose |
|---|---|
| `describe_corpus` | What the corpus contains, and explicitly what it does not. Call before assuming coverage. |
| `list_books` | Catalogue listing with resource URIs. |
| `resolve_book_id` | Free-text title/author/topic → slug. |
| `search_books` | Find books discussing a subject. |
| `get_book_context` | Read attributed passages from one book, optionally topic-scoped. |

Each tool carries an `examples` pair — one question it answers well, one it does not — surfaced
through `describe_corpus` so clients pick the right tool without trial and error.

### Prompts

`list_books`, `compare_authors`, `summarise_book`.

### Resources

`books://corpus-summary`, and one `books://book/{slug}` per catalogue record.

## Architecture

```
app/
  (marketing)/page.tsx        server component: fetch, then render client view
  books/[slug]/page.tsx       metadata, JSON-LD gating, detail view
  api/chat|mcp|search/        thin route handlers
  sitemap.ts                  excludes synthetic slugs
src/
  core/books/                 domain layer — entities, outcomes, retrieval, corpus stats
  db/                         Drizzle schema, client, SQL migrations
  features/books|chat/        UI components, feature-scoped
  mcp/                        registry, agent loop, and resources|prompts|tools per use case
```

The domain layer under `src/core` is framework-agnostic; the website and the MCP tools call the
same use cases, so the two surfaces cannot return different answers for the same question.

## Data and licensing

The catalogue mixes real public-domain works with AI-generated demonstration records. Synthetic
records are marked at every layer and are **not citable**. See [DATA.md](DATA.md) for the full
per-source breakdown.

Synthetic entries carry `generated_by`, `generated_at`, and `synthetic_notice` columns, and a
database constraint rejects any synthetic row missing them.

## Roadmap

- [ ] Backfill embeddings and add an `embedding` column; retrieval flips to hybrid automatically
      once present (`retrievalMode()` probes for the column)
- [ ] Replace `ts_rank` with true BM25 scoring
- [ ] Generate the topic taxonomy at ingest
- [ ] Index real public-domain works alongside the synthetic fixtures
- [ ] Test suite around outcome labels and provenance marking
