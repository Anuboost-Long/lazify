import { PRECEDENCE, type BuiltinPreset } from "./types";

export const refactor: BuiltinPreset = {
  id: "builtin-refactor",
  name: "Refactor",
  description: "Changing the shape of the code without changing what it does.",
  sortOrder: 3,
  template: `Refactor the following area of {{project_name}}.

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

Instructions:
- Preserve existing external behavior exactly.
- Improve maintainability.
- Avoid unnecessary abstraction.
- Follow existing project conventions.
- Do not introduce dependencies unless required.
- Do not mix behavior changes into the refactor.

When finished:
- List the files you changed.
- Explain what was improved.
- Mention any behavior that changed, and why it had to.

${PRECEDENCE}
`
};
