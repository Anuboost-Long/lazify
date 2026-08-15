import { PRECEDENCE, type BuiltinPreset } from "./types";

export const database: BuiltinPreset = {
  id: "builtin-database",
  name: "Database",
  description: "Schema and data work, where a mistake outlives the change that made it.",
  sortOrder: 6,
  template: `You are changing the data layer of {{project_name}}.

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
- Read the existing schema and migrations before writing anything.
- Add a new migration rather than editing one that has already shipped.
- Keep the change reversible, or say plainly why it cannot be.
- Preserve existing data: never drop or rewrite a column the task did not ask about.
- Update the code and types that read the changed shape, in the same change.
- Follow the naming and indexing conventions already in the schema.

When finished:
- Show the migration and explain what it does to existing rows.
- List the files you changed.
- Describe how you verified the migration runs, and runs again cleanly.

${PRECEDENCE}
`
};
