import type Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { isReadOnly } from "@/lib/runtime";

/**
 * better-sqlite3 is loaded lazily, and this is a deployment concern rather than a
 * performance one.
 *
 * It is a native addon. A static import would make the host resolve and load the
 * compiled binary as soon as anything in the module graph is touched, including on
 * a read-only build that never opens a database at all. If that native build is
 * missing or was compiled for another platform, the whole site fails rather than
 * one unused code path. Requiring it inside open() means the snapshot build never
 * asks for it.
 */
const lazyRequire = createRequire(import.meta.url);

type DatabaseConstructor = new (
  path: string,
  options?: { readonly?: boolean; fileMustExist?: boolean },
) => Database.Database;

function loadDriver(): DatabaseConstructor {
  return lazyRequire("better-sqlite3") as DatabaseConstructor;
}

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

/**
 * The live database is written by the sentinel and is gitignored. The snapshot is
 * committed so the deployed build has real data to render without a writable disk.
 */
const LIVE_DB = join(process.cwd(), "data", "spinneret.db");
const SNAPSHOT_DB = join(process.cwd(), "data", "snapshot.db");

function resolvePath(): string {
  if (process.env.SPINNERET_DB) return process.env.SPINNERET_DB;
  if (isReadOnly() && existsSync(SNAPSHOT_DB)) return SNAPSHOT_DB;
  return LIVE_DB;
}

function open(): Database.Database {
  const path = resolvePath();
  const readOnly = isReadOnly();

  if (!readOnly) mkdirSync(dirname(path), { recursive: true });

  const SqliteDatabase = loadDriver();
  const db = new SqliteDatabase(path, { readonly: readOnly, fileMustExist: readOnly });

  if (readOnly) {
    // No pragmas, no migration, no schema exec: every one of those writes, and
    // the snapshot already carries the finished schema.
    return db;
  }

  // WAL lets the sentinel write while the dashboard reads, without lock waits.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);

  const schema = readFileSync(join(process.cwd(), "src", "db", "schema.sql"), "utf8");
  db.exec(schema);
  return db;
}

/**
 * Forward migrations for databases created by an earlier version.
 *
 * schema.sql is all CREATE IF NOT EXISTS, so it cannot add a column to a table
 * that already exists. These run first and are written to be safe to repeat.
 */
function migrate(db: Database.Database): void {
  const signalsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='signals'")
    .get();
  if (!signalsExists) return;

  const columns = db.prepare("PRAGMA table_info(signals)").all() as { name: string }[];
  if (columns.some((column) => column.name === "fingerprint")) return;

  // The old dedupe index keyed on headline and has to go before the new one lands.
  db.exec("DROP INDEX IF EXISTS idx_signals_dedupe");
  db.exec("ALTER TABLE signals ADD COLUMN fingerprint TEXT NOT NULL DEFAULT ''");
  // Rows predating the column cannot be re-fingerprinted from storage alone, so
  // they are cleared and rebuilt on the next observation.
  db.exec("DELETE FROM signals");
}

export function getDb(): Database.Database {
  if (!globalThis.__spinneretDb) {
    globalThis.__spinneretDb = open();
  }
  return globalThis.__spinneretDb;
}
