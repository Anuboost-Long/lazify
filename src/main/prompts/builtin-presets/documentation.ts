import { PRECEDENCE, type BuiltinPreset } from "./types";

export const documentation: BuiltinPreset = {
  id: "builtin-documentation",
  name: "Documentation",
  description: "Writing it down, where anything invented is worse than a gap.",
  sortOrder: 9,
  template: `You are writing documentation for {{project_name}}.

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
- Read the code before describing it: document what it does, not what it should do.
- Follow the voice, structure and formatting of the surrounding documents.
- Do not invent options, flags, commands or behavior — verify each one in the code.
- Show the commands and examples that actually run in this project.
- Update what is already written rather than adding a second account beside it.
- Do not change code to match the documentation without being asked.

When finished:
- List the files you wrote or changed.
- Say which claims you verified against the code, and how.
- Name anything you could not confirm, rather than filling the gap.

${PRECEDENCE}
`
};
