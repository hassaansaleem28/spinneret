/** Single source of truth for docs navigation and scroll-spy. */
export interface DocSection {
  id: string;
  label: string;
  group: string;
}

export const DOC_SECTIONS: DocSection[] = [
  { id: "overview", label: "What Spinneret Is", group: "Start Here" },
  { id: "problem", label: "The Problem", group: "Start Here" },
  { id: "quickstart", label: "Quickstart", group: "Start Here" },

  { id: "loop", label: "The Healing Loop", group: "How It Works" },
  { id: "health", label: "Health Scoring", group: "How It Works" },
  { id: "drift", label: "Drift Detection", group: "How It Works" },
  { id: "prompts", label: "Prompt Composition", group: "How It Works" },
  { id: "signals", label: "Signal Scoring", group: "How It Works" },

  { id: "architecture", label: "Architecture", group: "Reference" },
  { id: "collectors", label: "Live Collectors", group: "Reference" },
  { id: "cli", label: "CLI Commands", group: "Reference" },
  { id: "api", label: "HTTP API", group: "Reference" },
  { id: "ethics", label: "Data Ethics", group: "Reference" },
];

export const DOC_GROUPS = [...new Set(DOC_SECTIONS.map((section) => section.group))];
