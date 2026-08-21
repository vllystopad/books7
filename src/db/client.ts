import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { Client } from "pg";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const databaseUrl = process.env.NEXT_APP_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("NEXT_APP_DATABASE_URL environment variable is not set");
}

const isLocalhost = databaseUrl.includes("localhost");

let db: any;

if (isLocalhost) {
  const client = new Client({
    connectionString: databaseUrl,
  });
  db = drizzle(client, { schema });
} else {
  const sql = neon(databaseUrl);
  db = drizzleNeon(sql, { schema });
}

export { db };
