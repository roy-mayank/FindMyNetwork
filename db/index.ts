import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  drizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

function defaultDataDbPath(): string {
  return path.join(process.cwd(), ".data", "findmynetwork.db");
}

function ensureDefaultDataDir(): void {
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Resolved path to the SQLite file (respects `DATABASE_PATH`). */
export function getResolvedDbFilePath(): string {
  return process.env.DATABASE_PATH ?? defaultDataDbPath();
}

/** Close the dev singleton connection and clear Drizzle cache so a new file can replace the DB. */
export function closeGlobalSqliteIfOpen(): void {
  try {
    globalForDb.sqlite?.close();
  } catch {
    /* ignore */
  }
  globalForDb.sqlite = undefined;
  globalForDb.drizzle = undefined;
}

/**
 * Deletes the SQLite database files (main + WAL sidecars) and reapplies migrations.
 * Call only after closing other handles; in dev, uses {@link closeGlobalSqliteIfOpen} first.
 */
export function nukeSqliteDatabaseAndMigrate(): void {
  const file = getResolvedDbFilePath();
  closeGlobalSqliteIfOpen();
  for (const p of [file, `${file}-wal`, `${file}-shm`]) {
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not delete ${p}: ${msg}`);
    }
  }
  if (!process.env.DATABASE_PATH) {
    ensureDefaultDataDir();
  } else {
    const parent = path.dirname(file);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
  }
  const db = getDb();
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

export function getSqlite(): Database.Database {
  if (globalForDb.sqlite) return globalForDb.sqlite;
  const file = getResolvedDbFilePath();
  if (!process.env.DATABASE_PATH) {
    ensureDefaultDataDir();
  }
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
