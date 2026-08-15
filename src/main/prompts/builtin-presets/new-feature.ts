import { PRECEDENCE, type BuiltinPreset } from "./types";

export const newFeature: BuiltinPreset = {
  id: "builtin-new-feature",
  name: "New Feature",
  description: "Building something that is not there yet, inside the existing architecture.",
  sortOrder: 1,
  template: `You are implementing a new feature in {{project_name}}.

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

Implementation Instructions:
- Inspect the existing implementation before making changes.
- Follow the project's existing architecture.
- Reuse existing components and services where appropriate.
- Avoid unnecessary dependencies.
- Keep the implementation modular.
- Preserve existing functionality.

When finished:
- Verify the feature works.
- Check for obvious regressions.
- List the files you changed.
- Summarize the implementation.

${PRECEDENCE}
`
};
