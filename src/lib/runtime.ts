/**
 * Runtime capability detection.
 *
 * The deployed build is a showcase, not a control plane. Vercel gives serverless
 * functions a read-only filesystem, and the operations this app performs are far
 * outside a request's lifetime anyway: a heal takes five to twenty-five minutes
 * and shells out to the Bright Data CLI. Neither is possible there, so rather
 * than ship buttons that fail, the deployed build serves a committed snapshot and
 * says plainly that it is one.
 *
 * Running locally, everything is live.
 */

/** True when the process cannot write data or spawn the Bright Data CLI. */
export function isReadOnly(): boolean {
  if (process.env.SPINNERET_READONLY === "true") return true;
  if (process.env.SPINNERET_READONLY === "false") return false;
  return Boolean(process.env.VERCEL);
}

export const READ_ONLY_REASON =
  "This deployment serves a snapshot. Running a collector or a heal needs a writable database and a long-lived process, so those actions run locally against Bright Data.";
