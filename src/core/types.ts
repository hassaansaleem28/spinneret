/**
 * Spinneret — core domain types.
 *
 * Everything in `src/core` is a pure function over these types: no database,
 * no network, no filesystem. That constraint is deliberate — the self-healing
 * decision logic is the part that most needs to be provable, so it is kept
 * free of I/O and covered by unit tests in `tests/`.
 */

/** How a collector's output is interpreted downstream. */
export type SourceKind = "hiring" | "directory" | "changelog" | "pricing";

/**
 * A registered Bright Data collector that Spinneret watches.
 * `collectorId` is the stable `c_*` handle — it survives every heal, which is
 * what lets downstream integrations keep pointing at one address forever.
 */
export interface Collector {
  slug: string;
  collectorId: string;
  url: string;
  kind: SourceKind;
  label: string;
  /**
   * Fields the collector is *contracted* to return. Divergence from this set is
   * what the sentinel treats as evidence of drift — not a hand-written alert.
   */
  expectedFields: string[];
  /**
   * Set for single-subject sources such as a competitor changelog, where every
   * row belongs to one company and no row carries a company name of its own.
   */
  subjectCompany?: string;
}

/** One execution of a collector. Rows are left untyped: shape is site-specific. */
export interface RunRecord {
  id: number;
  collectorSlug: string;
  startedAt: string;
  durationMs: number;
  ok: boolean;
  rowCount: number;
  error?: string;
  rows: Record<string, unknown>[];
}

/** Per-field occupancy for a single run. */
export interface FieldStat {
  field: string;
  /** Fraction of rows where the field held a usable (non-null, non-blank) value. */
  fillRate: number;
  /** True when the field never appeared as a key at all — a schema-level break. */
  absent: boolean;
}

/** Computed vitals for one run. This is what the fleet view renders. */
export interface HealthSnapshot {
  collectorSlug: string;
  runId: number;
  capturedAt: string;
  /** Mean fill rate across contracted fields, 0..1. */
  coverage: number;
  /** Fraction of contracted fields present as keys in the output, 0..1. */
  schemaConformance: number;
  /** Row count relative to the healthy baseline, clamped to 0..1. */
  yieldRatio: number;
  /** Weighted composite, 0..100. The single number on the dial. */
  score: number;
  fields: FieldStat[];
}

/** What the sentinel concluded about a run, and why. */
export type DriftSeverity = "healthy" | "degraded" | "critical" | "schema_gap";

export interface DriftVerdict {
  severity: DriftSeverity;
  /** Human-readable evidence lines. These become the heal prompt. */
  evidence: string[];
  /** Fields that regressed materially against baseline. */
  regressedFields: FieldRegression[];
  /** Fields contracted but never returned. */
  missingFields: string[];
  /** True when the sentinel should dispatch a heal without asking a human. */
  shouldHeal: boolean;
}

export interface FieldRegression {
  field: string;
  baselineFillRate: number;
  currentFillRate: number;
  /** Percentage-point drop, positive means worse. */
  dropPct: number;
}

/** Rolling reference derived from prior healthy runs. */
export interface Baseline {
  collectorSlug: string;
  sampleSize: number;
  medianRowCount: number;
  fieldFillRates: Record<string, number>;
}

/** Lifecycle of one self-healing cycle. */
export type HealStatus =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "verified"
  | "failed";

export interface HealAttempt {
  id: number;
  collectorSlug: string;
  createdAt: string;
  /** The machine-authored prompt sent to `bdata scraper heal`. */
  prompt: string;
  status: HealStatus;
  /** Health score immediately before the heal. */
  scoreBefore: number;
  /** Health score on the verification run after approval. */
  scoreAfter?: number;
  notes?: string;
}

/** A dated, scored buying signal derived from collector output. */
export interface Signal {
  id: number;
  collectorSlug: string;
  detectedAt: string;
  company: string;
  kind: SourceKind;
  /** Short description of what changed. */
  headline: string;
  /** 0..100 intent score. */
  intent: number;
  /** Why the score is what it is — shown in the UI, never a black box. */
  rationale: string[];
  sourceUrl?: string;
}
