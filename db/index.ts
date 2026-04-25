import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

function defaultDbFile(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "findmynetwork.db");
}

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  drizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getSqlite(): Database.Database {
  if (globalForDb.sqlite) return globalForDb.sqlite;
  const file = process.env.DATABASE_PATH ?? defaultDbFile();
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  if (process.env.NODE_ENV !== "production") {
    globalForDb.sqlite = sqlite;
  }
  return sqlite;
}

export function getDb() {
  if (globalForDb.drizzle) return globalForDb.drizzle;
  const d = drizzle(getSqlite(), { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.drizzle = d;
  }
  return d;
}

export { schema };
