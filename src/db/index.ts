import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Single long-lived SQLite handle.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * file handle on every edit until the process runs out; caching on globalThis is
 * the standard way to hold one connection across reloads.
 */
declare global {
  var __spinneretDb: Database.Database | undefined;
}

const DB_PATH = process.env.SPINNERET_DB ?? join(process.cwd(), "data", "spinneret.db");

function open(): Database.Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);

  // WAL lets the sentinel write while the dashboard reads, without lock waits.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = readFileSync(join(process.cwd(), "src", "db", "schema.sql"), "utf8");
  db.exec(schema);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__spinneretDb) {
    globalThis.__spinneretDb = open();
  }
  return globalThis.__spinneretDb;
}
