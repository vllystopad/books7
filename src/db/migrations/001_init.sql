-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Books table
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  cover_url VARCHAR(512),
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  year INTEGER,
  source VARCHAR(50) NOT NULL,
  license VARCHAR(100),
  tokens_total INTEGER NOT NULL DEFAULT 0,
  chapters_count INTEGER NOT NULL DEFAULT 0,
  trust_score NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX books_slug_idx ON books(slug);
CREATE INDEX books_source_idx ON books(source);

-- Chapters table
CREATE TABLE chapters (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chapters_book_id_idx ON chapters(book_id);
CREATE INDEX chapters_order_idx ON chapters("order");

-- Chunks table with vector embedding
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  "order" INTEGER NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chunks_book_id_idx ON chunks(book_id);
CREATE INDEX chunks_chapter_id_idx ON chunks(chapter_id);
CREATE INDEX chunks_embedding_hnsw_idx ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Topics table
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Book-Topics junction table
CREATE TABLE book_topics (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (book_id, topic_id)
);

CREATE INDEX book_topics_book_id_idx ON book_topics(book_id);
CREATE INDEX book_topics_topic_id_idx ON book_topics(topic_id);
