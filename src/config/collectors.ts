import type { Collector } from "@/core/types";

/**
 * The watched fleet.
 *
 * `expectedFields` is a *contract*, not a description of current behaviour. It
 * states what each collector owes the downstream signal engine; anything it fails
 * to deliver is drift by definition. Writing the contract independently of the
 * scraper's actual output is what lets the sentinel notice a gap it was never
 * explicitly told about.
 *
 * Every target here is public, server-rendered or JS-rendered without a login
 * wall, carries no personal data, and has no pre-built Bright Data scraper — the
 * conditions the hackathon brief sets for a valid target.
 */
export const COLLECTORS: Collector[] = [
  {
    slug: "hiring-signals",
    collectorId: "c_mt4dzl5v15c84o86sa",
    url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs",
    kind: "hiring",
    label: "Remote GTM job board",
    expectedFields: ["company_name", "job_title", "location", "job_url"],
  },
  {
    slug: "funded-startups",
    collectorId: "c_mt4e1as4160iqj53as",
    url: "https://www.ycombinator.com/companies?batch=Summer%202025",
    kind: "directory",
    label: "Funded startup directory",
    expectedFields: ["company_name", "one_liner", "tags", "location", "company_url"],
  },
];

export function findCollector(slug: string): Collector | undefined {
  return COLLECTORS.find((collector) => collector.slug === slug);
}
