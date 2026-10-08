import type { DocPreset } from "./types";

const CONTRACT = `Answer format:
- Write JSON into {{answer_file}} and nothing else. Do not edit the job file.
- Shape: { "collection": { "<section id>": "markdown" }, "folders": [ { "id": "<folder id>", "description": "markdown" } ], "routes": [ { "requestId": "<id>", "sections": { "<section id>": "markdown" } } ] }
- Use only the section ids listed in {{job_file}}. Anything else is dropped on import.
- Plain markdown only: paragraphs, - lists, **bold**, \`code\`, fenced blocks, [links](https://example.com).
- Leave a section out rather than filling it with a guess.

House rules:
{{house_rules}}

Sections to fill, and what each one is for:
{{section_rules}}

Questions the scan could not answer:
{{open_questions}}

Routes in this collection:
{{route_list}}`;

export const DOC_PRESETS: DocPreset[] = [
  {
    id: "reference",
    name: "Reference",
    description: "Precise, per-route, the document a caller keeps open while integrating.",
    template: `You are writing the API reference for {{collection_name}} in {{project_name}}.

Read {{job_file}}. It holds every route in the collection with the parameters, headers, bodies and responses already discovered from the source, plus whatever prose exists today.

Read the project's source before describing a route. What the scan found is a skeleton, not the truth: confirm each route in the code and describe what it actually does.

${CONTRACT}
`
  },
  {
    id: "integration",
    name: "Integration guide",
    description: "Task-first: how a client gets from nothing to a working call.",
    template: `You are writing the integration guide for {{collection_name}} in {{project_name}}.

Read {{job_file}}. It holds every route with what was discovered from the source, plus whatever prose exists today.

Write for someone integrating for the first time. The collection sections carry the path from credential to first successful call; each route section still stands on its own for the reader who arrives by search.

${CONTRACT}
`
  },
  {
    id: "internal",
    name: "Internal handbook",
    description: "For the team that owns it: side effects, ordering, and what breaks.",
    template: `You are writing the internal handbook for {{collection_name}} in {{project_name}}.

Read {{job_file}}. It holds every route with what was discovered from the source, plus whatever prose exists today.

Write for the team that maintains this API. Say what a route touches, what it costs, what has to happen before it, and what goes wrong in production. Do not soften known problems.

${CONTRACT}
`
  }
];

export const DEFAULT_DOC_PRESET_ID = DOC_PRESETS[0].id;

export function docPreset(id: string): DocPreset {
  return DOC_PRESETS.find((preset) => preset.id === id) ?? DOC_PRESETS[0];
}
