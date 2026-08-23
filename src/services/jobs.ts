import { findCollector } from "@/config/collectors";
import * as repo from "@/db/repositories";
import { isReadOnly, READ_ONLY_REASON } from "@/lib/runtime";
import { tick } from "./scheduler";
import { approveAndVerify, heal, observe } from "./sentinel";

/**
 * Background job runner for operations that outlive an HTTP request.
 *
 * A heal can take fifteen minutes, far past any sensible request timeout, so the
 * API returns as soon as the work is accepted and the browser follows progress
 * through the event stream instead of holding a connection open.
 */

type JobKind = "observe" | "heal" | "approve";

/** One in-flight job per collector — concurrent runs would corrupt the baseline. */
const inFlight = new Map<string, JobKind>();

export interface JobAccepted {
  accepted: boolean;
  reason?: string;
}

export function startJob(slug: string, kind: JobKind, healId?: number): JobAccepted {
  if (isReadOnly()) return { accepted: false, reason: READ_ONLY_REASON };

  const collector = findCollector(slug);
  if (!collector) return { accepted: false, reason: `Unknown collector "${slug}"` };

  const running = inFlight.get(slug);
  if (running) {
    return { accepted: false, reason: `${slug} is already running a ${running} job` };
  }

  inFlight.set(slug, kind);

  // Deliberately not awaited: the caller gets an immediate acknowledgement and
  // the event log becomes the progress channel.
  void (async () => {
    try {
      if (kind === "observe") {
        await observe(collector);
      } else if (kind === "heal") {
        await heal(collector);
      } else if (kind === "approve") {
        if (healId === undefined) throw new Error("approve requires a healId");
        await approveAndVerify(collector, healId);
      }
    } catch (error) {
      repo.logEvent(
        "warn",
        `${kind} failed: ${error instanceof Error ? error.message : String(error)}`,
        slug,
      );
    } finally {
      inFlight.delete(slug);
    }
  })();

  return { accepted: true };
}

/** Guard so two sweeps cannot overlap and corrupt the shared baseline. */
let sweeping = false;

export function isSweeping(): boolean {
  return sweeping;
}

/**
 * Kick off a supervision pass over the whole fleet.
 *
 * Same code path the cron daemon uses — the button is a manual trigger for the
 * scheduled behaviour, not a second implementation of it.
 */
export function startSweep(): JobAccepted {
  if (isReadOnly()) return { accepted: false, reason: READ_ONLY_REASON };
  if (sweeping) return { accepted: false, reason: "A sweep is already running" };
  sweeping = true;

  void (async () => {
    try {
      await tick();
    } catch (error) {
      repo.logEvent(
        "warn",
        `Sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      sweeping = false;
    }
  })();

  return { accepted: true };
}
