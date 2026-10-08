import { PRECEDENCE, type BuiltinPreset } from "./types";

export const research: BuiltinPreset = {
  id: "builtin-research",
  name: "Research",
  description: "Answer a question about the project. Read, compare, recommend — do not change code.",
  sortOrder: 4,
  template: `Investigate the following topic for {{project_name}}.

Question:
{{task_name}}

Description:
{{task_description}}

Requirements:
{{task_requirements}}

Additional Context:
{{task_notes}}

Priority:
{{priority}}

Deadline:
{{deadline}}

Project Context:
{{project_context}}

Global Rules:
{{global_rules}}

Project Rules:
{{project_rules}}

Instructions:
- Inspect the existing project before recommending anything.
- Compare the reasonable implementation options.
- Explain the tradeoffs that actually matter here.
- Prefer solutions compatible with the current architecture.
- Do not modify code unless explicitly asked to.

Return:
- Findings
- Recommended approach
- Alternatives considered
- Risks or limitations

${PRECEDENCE}
`
};
