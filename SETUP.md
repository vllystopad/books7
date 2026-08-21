# Books7 Setup Guide (Neon + Vercel)

## Local Development

### 1. Create Neon Database

1. Go to https://console.neon.tech
2. Sign up with your GitHub account
3. Create a new project
4. Enable pgvector extension:
   - Open the SQL Editor in the Neon console
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
5. Copy the connection string (looks like: `postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname`)

### 2. Configure Local Environment

```bash
# Copy template
cp .env.example .env

# Edit .env and paste your Neon connection string
# NEXT_APP_DATABASE_URL=postgresql://...

# Optional: Add OpenAI key if you want faster embeddings
# NEXT_APP_OPENAI_API_KEY=sk-...
```

### 3. Run Migrations

```bash
npx drizzle-kit push
```

This creates all tables in your Neon database.

### 4. Seed Public Domain Books (Optional)

```bash
npm run seed
```

This downloads and ingests 4 public-domain books. Takes a few minutes depending on your internet and embedding provider.

### 5. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit: Books7 with Neon + Vercel setup"
git push origin main
```

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Paste your GitHub repo URL
4. Click "Import"

### 3. Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_APP_DATABASE_URL = (your Neon connection string)
NEXT_APP_OPENAI_API_KEY = (optional, your OpenAI key)
NODE_ENV = production
```

### 4. Deploy

Click "Deploy" — Vercel will:
- Install dependencies
- Run `npm run build`
- Deploy to CDN
- Set up serverless functions for API routes

Your app is live at: `https://your-project.vercel.app`

---

## Important Notes

### Neon Connection Pooling

If you get connection pool exhaustion errors:

1. In Neon console, go to your project → Connection pooling
2. Set pool mode to "Transaction" 
3. Use connection pooler URL instead: `postgresql://user:password@pooler.neon.tech/dbname`

### Vercel Limitations

- **Cold starts**: First request after deploy/idle takes ~5s (OK for this use case)
- **Timeout**: API routes have 25s timeout (plenty for search/embedding)
- **Logs**: View in Vercel dashboard → Functions → Logs

### Local Seeds Not in Production

When you run `npm run seed`, it only affects your local `.env` database. To seed your production Neon:

```bash
# Temporarily set NEXT_APP_DATABASE_URL to production
export NEXT_APP_DATABASE_URL="your-neon-production-url"
npm run seed

# Reset to local
export NEXT_APP_DATABASE_URL="your-neon-local-url"
```

Or create a separate Neon branch for production and only seed development branch.

---

## Monitoring

### Check Database Connections

In Neon console:
- Dashboard → Monitoring → Active connections
- Should see spikes during seed/ingestion, idle otherwise

### View Logs

**Local:**
```bash
npm run dev
```

**Production:**
Vercel dashboard → Deployments → Select deployment → Logs

---

## Next Steps

1. Ingest your own books: `npm run ingest <file> --slug author/book-title`
2. Test MCP tools via Claude Code
3. Customize UI (Stage 5)
4. Add rate limiting (future)

---

**Questions?** Check README.md for architecture and API docs.
