import { PRECEDENCE, type BuiltinPreset } from "./types";

export const general: BuiltinPreset = {
  id: "builtin-general",
  name: "General Development",
  description: "The default when no preset fits. Balanced instructions for ordinary work.",
  sortOrder: 0,
  template: `You are working on {{project_name}}.

Task:
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

Before making changes:
- Inspect the relevant existing code.
- Understand how the current implementation works.

While implementing:
- Reuse existing functionality where appropriate.
- Avoid unnecessary dependencies.
- Keep changes focused on the requested task.
- Preserve unrelated functionality.

When finished:
- Verify the implementation.
- List the files you changed.
- Summarize what was done.

${PRECEDENCE}
`
};
