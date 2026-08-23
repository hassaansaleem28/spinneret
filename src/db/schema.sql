-- Spinneret flight recorder.
-- Every run, vital sign, heal attempt and signal is durable, because the claim
-- "self-healing works" is only credible if the before/after numbers survive a
-- restart and can be replayed.

CREATE TABLE IF NOT EXISTS collectors (
  slug            TEXT PRIMARY KEY,
  collector_id    TEXT NOT NULL,
  url             TEXT NOT NULL,
  kind            TEXT NOT NULL,
  label           TEXT NOT NULL,
  expected_fields TEXT NOT NULL,          -- JSON array
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  collector_slug TEXT NOT NULL REFERENCES collectors(slug),
  started_at     TEXT NOT NULL,
  duration_ms    INTEGER NOT NULL,
  ok             INTEGER NOT NULL,
  row_count      INTEGER NOT NULL,
  error          TEXT,
  rows           TEXT NOT NULL            -- JSON array of raw rows
);
CREATE INDEX IF NOT EXISTS idx_runs_collector ON runs(collector_slug, started_at DESC);

CREATE TABLE IF NOT EXISTS health_snapshots (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id             INTEGER NOT NULL REFERENCES runs(id),
  collector_slug     TEXT NOT NULL REFERENCES collectors(slug),
  captured_at        TEXT NOT NULL,
  coverage           REAL NOT NULL,
  schema_conformance REAL NOT NULL,
  yield_ratio        REAL NOT NULL,
  score              INTEGER NOT NULL,
  fields             TEXT NOT NULL,       -- JSON array of FieldStat
  severity           TEXT NOT NULL,
  evidence           TEXT NOT NULL        -- JSON array of evidence lines
);
CREATE INDEX IF NOT EXISTS idx_health_collector
  ON health_snapshots(collector_slug, captured_at DESC);

CREATE TABLE IF NOT EXISTS heal_attempts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  collector_slug TEXT NOT NULL REFERENCES collectors(slug),
  created_at     TEXT NOT NULL,
  prompt         TEXT NOT NULL,
  status         TEXT NOT NULL,
  score_before   INTEGER NOT NULL,
  score_after    INTEGER,
  notes          TEXT
);
CREATE INDEX IF NOT EXISTS idx_heal_collector
  ON heal_attempts(collector_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS signals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  collector_slug TEXT NOT NULL REFERENCES collectors(slug),
  detected_at    TEXT NOT NULL,
  company        TEXT NOT NULL,
  fingerprint    TEXT NOT NULL DEFAULT '',
  kind           TEXT NOT NULL,
  headline       TEXT NOT NULL,
  intent         INTEGER NOT NULL,
  rationale      TEXT NOT NULL,           -- JSON array
  source_url     TEXT
);
CREATE INDEX IF NOT EXISTS idx_signals_intent ON signals(intent DESC, detected_at DESC);
-- Identity is the fingerprint, never the phrasing. Keying on headline let the
-- same openings re-enter as new signals whenever the sample title changed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_dedupe
  ON signals(fingerprint);

-- Append-only activity log driving the live console in the UI.
CREATE TABLE IF NOT EXISTS events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  at             TEXT NOT NULL,
  level          TEXT NOT NULL,           -- info | warn | heal | ok
  collector_slug TEXT,
  message        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at DESC);
