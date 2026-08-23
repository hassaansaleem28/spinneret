/**
 * Capture the live database as a committed JSON snapshot for the deployed build.
 *
 *   npm run snapshot
 *
 * Why JSON rather than shipping the SQLite file: better-sqlite3 is a native addon,
 * and a native build failing on the host would take the whole deployment down. The
 * hosted build has no writable disk and cannot run the Bright Data CLI anyway, so
 * it has nothing to gain from a real database. Serving a plain object removes an
 * entire class of deployment risk.
 *
 * Everything in the snapshot came from real collector runs. It is a recording,
 * not a fixture.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

process.env.SPINNERET_READONLY = "false";

async function main(): Promise<void> {
  // Imported after the env override so the state layer resolves to live mode.
  const { buildFleetState } = await import("@/services/state");

  const state = buildFleetState();
  const target = join(process.cwd(), "src", "data", "snapshot.json");

  writeFileSync(target, `${JSON.stringify({ ...state, readOnly: true }, null, 2)}\n`);

  console.log(`snapshot written to ${target}`);
  console.log(
    `  ${state.members.length} collectors · ${state.signals.length} signals · ` +
      `${state.heals.length} heals · ${state.events.length} events · ` +
      `fleet health ${state.summary.fleetHealth}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
