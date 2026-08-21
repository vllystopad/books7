import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.NEXT_APP_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("NEXT_APP_DATABASE_URL environment variable is not set");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
