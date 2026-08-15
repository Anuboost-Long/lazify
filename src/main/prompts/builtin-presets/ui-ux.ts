import { PRECEDENCE, type BuiltinPreset } from "./types";

export const uiUx: BuiltinPreset = {
  id: "builtin-ui-ux",
  name: "UI / UX",
  description: "Interface work, where matching what is already on screen matters most.",
  sortOrder: 5,
  template: `You are working on the interface of {{project_name}}.

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
- Read the surrounding screens first and match them: spacing, typography, tone.
- Reuse the existing components and design tokens rather than new one-off styles.
- Keep every state covered: loading, empty, error, and the ordinary one.
- Keep it usable by keyboard, and label controls for screen readers.
- Do not change behavior that was not asked about.

When finished:
- Describe what the user now sees and does.
- List the files you changed.
- Note any state you could not exercise.

${PRECEDENCE}
`
};
