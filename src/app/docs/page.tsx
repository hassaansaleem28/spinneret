import { ArchitectureDiagram } from "@/components/docs/ArchitectureDiagram";
import { HealLoopDiagram } from "@/components/docs/HealLoopDiagram";
import { HealthScoreDiagram } from "@/components/docs/HealthScoreDiagram";
import { PromptAnatomy } from "@/components/docs/PromptAnatomy";
import {
  Code,
  CodeBlock,
  DocSection,
  H3,
  Note,
  P,
  Pill,
} from "@/components/docs/DocsPrimitives";

export default function DocsPage() {
  return (
    <div className="max-w-[860px] space-y-14">
      {/* ---------------------------------------------------------- title */}
      <header>
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px w-8 bg-silk" aria-hidden="true" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-silk">
            Documentation
          </span>
        </div>
        <h1 className="font-display text-[clamp(2.4rem,4.4vw,3.4rem)] leading-[1.05] tracking-tight text-ink">
          How Spinneret works
        </h1>
        <p className="mt-5 max-w-[64ch] text-[16px] leading-[1.75] text-ink-muted">
          Spinneret is two systems that need each other. One finds companies worth
          contacting by watching public sources for change. The other keeps the
          scrapers behind that feed alive without a person babysitting them. This
          page explains both, including the arithmetic, the thresholds and the
          reasoning behind each decision.
        </p>
      </header>

      {/* ------------------------------------------------------- overview */}
      <DocSection id="overview" eyebrow="Start Here" title="What Spinneret Is">
        <P>
          Spinneret watches a small fleet of web scrapers built with Bright Data
          Scraper Studio. After every run it measures what came back, compares that
          against what the collector is contracted to deliver, and decides whether
          the scraper is still doing its job.
        </P>
        <P>
          When it is not, Spinneret writes a repair prompt from its own measurements,
          sends that prompt through Bright Data’s self-healing API, approves the
          resulting patch and re-runs the collector to check the score actually
          improved. The whole cycle needs no human to describe what broke.
        </P>
        <P>
          The data those collectors produce feeds a buying-signal board: a ranked list
          of companies where something recently changed in a way that suggests budget
          just moved.
        </P>
        <Note title="The Core Claim">
          A scraper that reports it is broken is a monitoring tool. A scraper that
          diagnoses itself, writes its own fix and then proves the fix worked is
          maintenance. Spinneret is built to be the second thing, and the heal ledger
          on the dashboard exists so you can audit that claim rather than trust it.
        </Note>
      </DocSection>

      {/* -------------------------------------------------------- problem */}
      <DocSection id="problem" eyebrow="Start Here" title="The Problem">
        <P>
          Scrapers rarely fail loudly. A site ships a redesign, a CSS selector stops
          matching, and the extraction code keeps running perfectly. It returns the
          same number of rows on the same schedule. The rows are just empty.
        </P>
        <P>
          Nothing in a normal pipeline notices this. HTTP returned 200. No exception
          was thrown. The job is green. Three weeks later a sales team reports that
          leads dried up, and someone starts bisecting a month of data to find out
          when the values turned into nulls.
        </P>
        <P>
          Spinneret treats that silence as the actual bug. Every run is measured
          against a contract, so a field that quietly empties out is a first-class
          event rather than something you discover downstream.
        </P>
        <H3>A real example from this project</H3>
        <P>
          The job-board collector was created from the description{" "}
          <Code>extract every job listing: job title and company name</Code>. Bright
          Data built a scraper that returned 66 rows, and every one of them contained
          a single field: <Code>product_page_url</Code>. Neither contracted field was
          present.
        </P>
        <P>
          A conventional pipeline would have called that a successful run of 66 rows.
          Spinneret scored it <strong className="text-ink">20 out of 100</strong>,
          classified it as a schema gap, and repaired it. Nothing about that break was
          staged for a demo.
        </P>
      </DocSection>

      {/* ----------------------------------------------------- quickstart */}
      <DocSection id="quickstart" eyebrow="Start Here" title="Quickstart">
        <P>
          You need Node 20 or newer and a Bright Data account. The free tier includes
          5,000 monthly credits and needs no card.
        </P>
        <CodeBlock label="terminal">{`git clone https://github.com/hassaansaleem28/spinneret
cd spinneret
npm install

cp .env.example .env.local        # paste your Bright Data token
npm run spinneret -- seed         # register the collectors
npm run dev                       # dashboard on localhost:3000`}</CodeBlock>
        <P>
          <Code>.env.local</Code> is gitignored. Keep your token out of commits and out
          of any screen recording.
        </P>
        <H3>Watch a collector heal itself</H3>
        <CodeBlock label="terminal">{`npm run spinneret -- observe hiring-signals   # run, measure, diagnose
npm run spinneret -- heal hiring-signals      # compose a prompt, dispatch it
npm run spinneret -- approve hiring-signals 1 # approve, re-run, record the delta`}</CodeBlock>
        <P>
          Or run the whole loop unattended with{" "}
          <Code>npm run spinneret -- cycle hiring-signals</Code>, which heals only if
          the evidence justifies it.
        </P>
      </DocSection>

      {/* ----------------------------------------------------------- loop */}
      <DocSection id="loop" eyebrow="How It Works" title="The Healing Loop">
        <P>
          Seven stages, running continuously. The first three happen on every
          observation. The last four only run when the diagnosis found evidence worth
          acting on.
        </P>
        <HealLoopDiagram />
        <H3>When Spinneret refuses to heal</H3>
        <P>
          There are two cases, and both are deliberate.
        </P>
        <P>
          <strong className="text-ink">A run that never completed.</strong> If the
          request timed out or was rate limited, nothing came back. Every field looks
          absent, which is indistinguishable from a site that rewrote itself
          completely. Healing that would burn a cycle and give the healing AI no live
          page to work from. Transport failure is not drift.
        </P>
        <P>
          A collector that is merely degraded, with no specific field identified as
          the cause, is left alone on purpose. An unfocused prompt such as{" "}
          <Code>the scraper seems wrong</Code> tends to make a working scraper worse,
          because the healing AI has nothing specific to anchor a rewrite to. In that
          case Spinneret records the evidence, marks the collector degraded and waits
          for a person.
        </P>
        <P>
          The same reasoning drives the cooldown. A heal that ran and did not raise the
          score is never retried on a timer, because re-sending a prompt already shown
          not to work costs credits and can degrade the scraper further. A visibly
          broken collector is the better failure mode.
        </P>
      </DocSection>

      {/* --------------------------------------------------------- health */}
      <DocSection id="health" eyebrow="How It Works" title="Health Scoring">
        <P>
          Every run produces one number between 0 and 100, made of three weighted
          terms. Try the scenarios below to see how the same formula separates a
          schema gap from a selector drift from a pagination break.
        </P>
        <HealthScoreDiagram />

        <H3>Why a value has to carry information</H3>
        <P>
          Coverage counts a field as filled only if its value means something.{" "}
          <Code>null</Code>, an empty string, whitespace, and the literal strings{" "}
          <Code>&quot;null&quot;</Code>, <Code>&quot;N/A&quot;</Code> and{" "}
          <Code>&quot;undefined&quot;</Code> all count as missing, as do empty arrays
          and empty objects. Broken scrapers emit these constantly, and treating them
          as real values is exactly how a hollow pipeline passes as healthy.
        </P>

        <H3>Two decisions about the baseline</H3>
        <P>
          Yield compares row count against a rolling baseline, and how that baseline is
          built matters more than the comparison itself.
        </P>
        <P>
          It uses the <strong className="text-ink">median</strong>, not the mean. One
          catastrophic run returning two rows would drag a mean low enough to hide the
          next real break behind it.
        </P>
        <P>
          It is built <strong className="text-ink">only from runs that already scored
          well</strong>. If degraded runs fed the baseline, the degradation would
          quietly redefine normal, and the following break would register as an
          improvement.
        </P>
        <Note title="First Runs Are Not Punished">
          A collector with no history has no baseline to compare against, so yield is
          treated as nominal rather than zero. A brand-new collector is not flagged as
          broken merely for being new.
        </Note>
      </DocSection>

      {/* ---------------------------------------------------------- drift */}
      <DocSection id="drift" eyebrow="How It Works" title="Drift Detection">
        <P>
          Drift detection turns a score into a decision. It compares the run against
          the baseline, classifies the severity, and produces the evidence lines that
          later become the repair prompt.
        </P>

        <H3>Severity</H3>
        <div className="max-w-[68ch] space-y-2.5">
          {[
            ["schema_gap", "Any contracted field is absent as a key. Always heals.", "The field is gone, not empty. This is a schema-level break."],
            ["critical", "Composite score below 55. Always heals.", "Something substantial stopped working."],
            ["degraded", "Score below 80, or any field regressed against baseline.", "Heals only if a specific field was identified."],
            ["healthy", "Everything within tolerance.", "No action."],
            ["unreachable", "The run never completed. Never heals.", "A timeout or rate limit returns nothing, which looks identical to a total site rewrite. There is no DOM to repair against, so healing would spend a cycle blind."],
          ].map(([level, rule, why]) => (
            <div key={level} className="rounded-lg border border-line bg-surface-2 p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Pill>{level}</Pill>
                <span className="text-[13.5px] text-ink">{rule}</span>
              </div>
              <p className="mt-1.5 text-[13px] text-ink-faint">{why}</p>
            </div>
          ))}
        </div>

        <H3>Thresholds</H3>
        <CodeBlock label="src/core/drift.ts">{`regressionDropPct:   25   // percentage-point fill-rate drop that counts
criticalScore:       55   // below this is a hard break
degradedScore:       80   // below this is degradation
minBaselineSamples:   2   // healthy runs needed before trusting comparisons`}</CodeBlock>
        <P>
          These are deliberately conservative. A false positive costs one heal cycle
          and an approval gate. A false negative costs silently hollow data for days,
          which is the failure this whole system exists to prevent.
        </P>

        <H3>Telling two breaks apart</H3>
        <P>
          When fields regress but row count holds steady, the evidence says so
          explicitly: pagination and the row selector are intact, so the breakage is
          field level. When row count collapses instead, the evidence points at the row
          or pagination selector. These need different repairs, and naming which one it
          is steers the healing AI at the right part of the code.
        </P>
      </DocSection>

      {/* -------------------------------------------------------- prompts */}
      <DocSection id="prompts" eyebrow="How It Works" title="Prompt Composition">
        <P>
          This is the part that makes Spinneret different from a monitoring dashboard.
          The instruction sent to Bright Data is assembled from measurements, not typed
          by a person.
        </P>
        <PromptAnatomy />

        <H3>Fencing off what still works</H3>
        <P>
          When a collector is partially broken, the prompt lists the fields still
          filling above 90 percent and instructs the healing AI not to touch them.
          Without that clause a rewrite can regress working extraction while fixing the
          broken part, and the verification run would show a heal that helped one field
          and broke two others.
        </P>

        <H3>Two prompt shapes</H3>
        <P>
          If some contracted fields arrive and others never appeared, the task is to{" "}
          <strong className="text-ink">extend</strong> the schema, and the prompt says
          so plainly. If fields that used to work have hollowed out, the task is to{" "}
          <strong className="text-ink">repair</strong> drifted selectors. Naming the
          narrower job produces a more reliable patch.
        </P>

        <H3>The character budget</H3>
        <P>
          The CLI caps prompts at 1000 characters. Spinneret budgets to 960 to leave
          room for shell escaping. When the budget binds it drops evidence lines from
          the middle, because the opening clause names the target and the closing clause
          states the required schema, and losing either one produces a worse patch than
          losing a detail.
        </P>
      </DocSection>

      {/* ------------------------------------------------------------ lab */}
      <DocSection id="lab" eyebrow="How It Works" title="Contract Lab">
        <P>
          Everything else on the dashboard is retrospective. It reports what already
          happened and asks you to believe it. The Contract Lab is the one place you
          can act, and it exists because a self-healing claim deserves to be tested
          rather than trusted.
        </P>
        <P>
          Pick a collector, change what it is required to return, and the whole
          diagnosis re-runs in front of you: coverage moves, evidence assembles, and
          the repair prompt writes itself a character at a time.
        </P>

        <H3>None of it is simulated</H3>
        <P>
          The rows being scored are rows those collectors genuinely returned on their
          last healthy run. The scoring, the drift classification and the prompt
          composition are the same functions the sentinel runs in production, not a
          demonstration copy. Because the contract is the real definition of correct,
          requiring a field the scraper does not produce makes it genuinely
          non-compliant, and the text that appears is exactly what Spinneret would
          dispatch to Bright Data.
        </P>

        <H3>Try this</H3>
        <P>
          Require <Code>salary</Code> on the job board collector. The score drops, the
          field reads absent, and the prompt names it as the repair target while
          explicitly fencing off the fields that still work. That protection clause is
          generated, not written by hand, and it is what stops a repair regressing
          extraction that was already correct.
        </P>

        <Note title="Why This Runs In Your Browser">
          The scoring layer performs no I/O, which is the whole reason it can be
          tested without a database or a Bright Data account. That same property lets
          it ship to the client and run with zero latency, which is why the lab works
          on the hosted snapshot as well as locally.
        </Note>
      </DocSection>

      {/* -------------------------------------------------------- signals */}
      <DocSection id="signals" eyebrow="How It Works" title="Signal Scoring">
        <P>
          A company in a directory is not a lead. A company that just opened four
          revenue roles is. Spinneret scores change, and every point traces back to a
          stated rule shown in the interface, because nobody acts on a number they
          cannot argue with.
        </P>

        <H3>Each source type gets its own rules</H3>
        <P>
          A job title, a changelog entry and a directory listing say different things
          about intent, so each runs against its own table rather than one table
          stretched across all three. Within a table only the strongest matching rule
          applies, which stops a company with many similar rows compounding the same
          evidence.
        </P>

        <div className="max-w-[68ch] overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {["Source", "Rule", "Points", "Reasoning"].map((heading) => (
                  <th
                    key={heading}
                    className="px-3.5 py-2.5 text-left font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              {[
                ["hiring", "GTM leadership hire", "34", "New leaders re-tool their stack within a quarter"],
                ["hiring", "RevOps hire", "32", "An explicit mandate to buy and integrate tooling"],
                ["hiring", "Revenue-carrying role", "30", "Quota capacity is being added"],
                ["changelog", "Enterprise readiness", "34", "SSO, SCIM and audit logs mean larger deals ahead"],
                ["changelog", "Integration surface", "26", "Points to an ecosystem play"],
                ["directory", "B2B software", "24", "Buys tooling as a matter of course"],
                ["any", "Newly appeared", "22", "The change is fresh, not historical"],
                ["any", "Concurrent activity", "≤27", "Coordinated build-out rather than backfill"],
              ].map((row) => (
                <tr key={`${row[0]}-${row[1]}`} className="border-b border-line/60 last:border-0">
                  <td className="px-3.5 py-2.5">
                    <Pill>{row[0]}</Pill>
                  </td>
                  <td className="px-3.5 py-2.5 text-ink">{row[1]}</td>
                  <td className="tabular px-3.5 py-2.5 font-mono text-[12.5px]">{row[2]}</td>
                  <td className="px-3.5 py-2.5">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Note title="No Rule, No Signal">
          If nothing matches, Spinneret emits nothing. It never invents intent it
          cannot justify, and there is a unit test asserting exactly that: a changelog
          entry mentioning an “account executive dashboard” produces no hiring signal,
          because that phrase names a feature rather than a hire.
        </Note>

        <H3>Single-subject sources</H3>
        <P>
          A competitor changelog has no company column. Every entry belongs to the one
          company that publishes it. Those collectors declare a{" "}
          <Code>subjectCompany</Code>, so attribution comes from the collector rather
          than from a field that will never exist.
        </P>
      </DocSection>

      {/* --------------------------------------------------- architecture */}
      <DocSection id="architecture" eyebrow="Reference" title="Architecture">
        <P>
          Four layers, with dependencies pointing one direction only.
        </P>
        <ArchitectureDiagram />
        <H3>What lives in the core</H3>
        <CodeBlock label="src/core/">{`health.ts       fill rate, schema conformance, yield → composite score
drift.ts        baseline comparison → severity + evidence lines
heal-prompt.ts  evidence → natural-language repair instruction
signals.ts      rows → scored buying signals with stated rationale
cooldown.ts     whether a fresh heal is permitted yet
types.ts        the domain vocabulary everything else speaks`}</CodeBlock>
        <P>
          These modules are covered by 48 unit tests. The retry policy in{" "}
          <Code>cooldown.ts</Code> is pure specifically because it is the code that
          spends money without supervision, so it is worth testing exhaustively.
        </P>
      </DocSection>

      {/* ---------------------------------------------------- collectors */}
      <DocSection id="collectors" eyebrow="Reference" title="Live Collectors">
        <P>
          Three collectors, deliberately different in shape so they exercise different
          parts of the health model.
        </P>
        <div className="max-w-[68ch] space-y-3">
          {[
            {
              slug: "hiring-signals",
              id: "c_mt4dzl5v15c84o86sa",
              target: "WeWorkRemotely GTM job board",
              shape: "Paginated listing. The collector that was born broken and healed itself from 20 to 97.",
            },
            {
              slug: "funded-startups",
              id: "c_mt4e1as4160iqj53as",
              target: "Y Combinator directory, Summer 2025",
              shape: "JavaScript-rendered directory with an array field, which is why tags sits near 75 percent rather than 100.",
            },
            {
              slug: "product-velocity",
              id: "c_mt4fj43j1tvgzr9bs2",
              target: "Linear changelog",
              shape: "Single-subject source with no company column at all.",
            },
          ].map((collector) => (
            <div key={collector.slug} className="rounded-lg border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h4 className="font-mono text-[13.5px] font-semibold text-ink">
                  {collector.slug}
                </h4>
                <code translate="no" className="font-mono text-[11.5px] text-silk">
                  {collector.id}
                </code>
              </div>
              <p className="mt-1.5 text-[13.5px] text-ink-muted">{collector.target}</p>
              <p className="mt-1 text-[13px] text-ink-faint">{collector.shape}</p>
            </div>
          ))}
        </div>
        <Note title="Why Not LinkedIn">
          LinkedIn already has a pre-built Bright Data scraper. Pointing at it would
          have meant not really using Scraper Studio at all, so every target here is a
          niche source with no pre-built equivalent.
        </Note>
      </DocSection>

      {/* ------------------------------------------------------------ cli */}
      <DocSection id="cli" eyebrow="Reference" title="CLI Commands">
        <P>
          Everything the dashboard can do is also a command, and both call the same
          service layer rather than reimplementing each other.
        </P>
        <CodeBlock label="npm run spinneret -- <command>">{`seed                          register collectors from config into the database
create <url> "<description>"  build a new collector with Scraper Studio
observe <slug>                run, measure, diagnose, store
heal <slug>                   compose a prompt from telemetry and dispatch it
approve <slug> <healId>       approve the patch, re-run, record before and after
cycle <slug>                  the whole loop, healing only when justified
status                        fleet health and recent heals`}</CodeBlock>
        <H3>Running on a schedule</H3>
        <CodeBlock label="terminal">{`npm run watch                                 # every 30 minutes
SPINNERET_CRON="*/10 * * * *" npm run watch    # or set your own`}</CodeBlock>
        <P>
          A sweep can outlast its own interval during a slow heal, so a late tick is
          skipped rather than queued. Overlapping runs would corrupt the shared
          baseline.
        </P>
      </DocSection>

      {/* ------------------------------------------------------------ api */}
      <DocSection id="api" eyebrow="Reference" title="HTTP API">
        <P>
          Thin routes over the service layer. Long operations return immediately and
          report progress through the event stream, because a heal can run for fifteen
          minutes and no browser should hold a request open that long.
        </P>
        <div className="max-w-[68ch] overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {["Method", "Route", "Purpose"].map((heading) => (
                  <th
                    key={heading}
                    className="px-3.5 py-2.5 text-left font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              {[
                ["GET", "/api/state", "Whole-dashboard snapshot in one round trip"],
                ["GET", "/api/stream", "Server-sent events, pushing state every 2 seconds"],
                ["POST", "/api/observe", "Run and measure one collector"],
                ["POST", "/api/heal", "Compose and dispatch a repair for one collector"],
                ["POST", "/api/approve", "Approve a pending heal, then verify it"],
                ["POST", "/api/sweep", "Supervise the whole fleet, the same pass cron runs"],
              ].map((row) => (
                <tr key={row[1]} className="border-b border-line/60 last:border-0">
                  <td className="px-3.5 py-2.5">
                    <Pill>{row[0]}</Pill>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <code translate="no" className="font-mono text-[12.5px] text-ink">
                      {row[1]}
                    </code>
                  </td>
                  <td className="px-3.5 py-2.5">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          Server-sent events rather than websockets: data only travels one way, and
          EventSource reconnects on its own, so a dropped connection during a long heal
          recovers with no client retry code.
        </P>
      </DocSection>

      {/* --------------------------------------------------------- ethics */}
      <DocSection id="ethics" eyebrow="Reference" title="Data Ethics">
        <P>
          Public data only. No login-walled sources, no paywalled content, and no
          personal data.
        </P>
        <P>
          Signals are scored at company level and derived from public job postings,
          directory listings and published changelogs. Spinneret does not collect,
          store or score details about any individual. A job posting contributes its
          title and its employer, never a named person.
        </P>
        <P>
          Every target is a source with no pre-built Bright Data scraper, chosen from
          the categories the brief asks for: niche job boards, regional and vertical
          directories, and competitor changelogs.
        </P>
      </DocSection>
    </div>
  );
}
