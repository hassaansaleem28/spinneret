import { spawn } from "node:child_process";

/**
 * Adapter over the Bright Data CLI.
 *
 * Scraper Studio's create/run/heal/approve verbs are exposed through the CLI
 * rather than the REST surface, so Spinneret shells out to `npx -p @brightdata/cli`
 * exactly as the hackathon brief prescribes. Isolating that here means the rest of
 * the app never touches a child process, and the whole integration can be faked in
 * tests by substituting this module.
 */

const CLI_PACKAGE = "@brightdata/cli";

export interface CliResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  durationMs: number;
}

export class BrightDataError extends Error {
  constructor(
    message: string,
    readonly result: CliResult,
  ) {
    super(message);
    this.name = "BrightDataError";
  }
}

/**
 * Run one `bdata` invocation.
 *
 * The API key is passed through the environment rather than the `--api-key` flag
 * so the token never appears in a process listing or a shell history file.
 */
export function invoke(args: string[], timeoutMs = 1_800_000): Promise<CliResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn("npx", ["-p", CLI_PACKAGE, "bdata", ...args], {
      env: { ...process.env, BRIGHTDATA_API_KEY: requireApiKey() },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        stdout,
        stderr: timedOut ? `${stderr}\n[spinneret] timed out after ${timeoutMs}ms` : stderr,
        code,
        durationMs: Date.now() - startedAt,
      });
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        stdout,
        stderr: `${stderr}\n${error.message}`,
        code: null,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

function requireApiKey(): string {
  const key = process.env.BRIGHTDATA_API_KEY;
  if (!key) {
    throw new Error(
      "BRIGHTDATA_API_KEY is not set. Copy .env.example to .env.local and add your token.",
    );
  }
  return key;
}

/**
 * The CLI prints human-readable progress lines before its JSON payload, so the
 * payload is recovered by scanning for the outermost JSON value rather than
 * parsing the whole stream.
 */
export function extractJson<T>(stdout: string): T | undefined {
  const candidates: string[] = [];

  const firstArray = stdout.indexOf("[");
  const lastArray = stdout.lastIndexOf("]");
  if (firstArray !== -1 && lastArray > firstArray) {
    candidates.push(stdout.slice(firstArray, lastArray + 1));
  }

  const firstObject = stdout.indexOf("{");
  const lastObject = stdout.lastIndexOf("}");
  if (firstObject !== -1 && lastObject > firstObject) {
    candidates.push(stdout.slice(firstObject, lastObject + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try the next candidate rather than failing the whole run.
    }
  }
  return undefined;
}

/* ------------------------------------------------------------- scraper verbs */

export interface CreateEnvelope {
  collector_id: string;
  name: string;
  status: string;
  view_url?: string;
}

/** Build a new collector. Takes 5-25 minutes; the CLI polls internally. */
export async function scraperCreate(
  url: string,
  description: string,
  name: string,
): Promise<CreateEnvelope> {
  const result = await invoke([
    "scraper", "create", url, description, "--name", name, "--json",
  ]);
  const envelope = extractJson<CreateEnvelope>(result.stdout);
  if (!envelope?.collector_id) {
    throw new BrightDataError("scraper create returned no collector_id", result);
  }
  return envelope;
}

export interface RunOutcome {
  rows: Record<string, unknown>[];
  durationMs: number;
  ok: boolean;
  error?: string;
}

/**
 * Execute a collector against a URL.
 *
 * A failed run is returned rather than thrown: an outage is itself a health
 * observation the sentinel needs to record, not an exception to unwind on.
 */
export async function scraperRun(collectorId: string, url: string): Promise<RunOutcome> {
  const result = await invoke(["scraper", "run", collectorId, url, "--json"]);

  if (!result.ok) {
    return {
      rows: [],
      durationMs: result.durationMs,
      ok: false,
      error: result.stderr.trim().slice(0, 500) || `exit code ${result.code}`,
    };
  }

  const payload = extractJson<unknown>(result.stdout);
  return {
    rows: normalizeRows(payload),
    durationMs: result.durationMs,
    ok: true,
  };
}

/** Collector output arrives as a bare array or wrapped; both are accepted. */
export function normalizeRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    for (const key of ["data", "rows", "results", "items"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
  }
  return [];
}

export interface HealEnvelope {
  collector_id?: string;
  status?: string;
  prompt?: string;
  next_step?: string;
}

/**
 * Dispatch a self-heal.
 *
 * `autoApprove` is exposed but defaults off: Spinneret's design is that the
 * machine writes the prompt and the machine measures the result, while the gate
 * between proposal and production stays explicit and auditable.
 */
export async function scraperHeal(
  collectorId: string,
  prompt: string,
  url: string,
  autoApprove = false,
): Promise<{ envelope?: HealEnvelope; result: CliResult }> {
  const args = ["scraper", "heal", collectorId, prompt, "--url", url, "--json"];
  if (autoApprove) args.push("--auto-approve", "--auto-save");

  const result = await invoke(args);
  return { envelope: extractJson<HealEnvelope>(result.stdout), result };
}

export async function scraperApprove(
  collectorId: string,
  url: string,
  reject = false,
): Promise<{ envelope?: HealEnvelope; result: CliResult }> {
  const args = ["scraper", "approve", collectorId, "--json", "--auto-save"];
  if (reject) args.push("--reject");
  else args.push("--url", url);

  const result = await invoke(args);
  return { envelope: extractJson<HealEnvelope>(result.stdout), result };
}
