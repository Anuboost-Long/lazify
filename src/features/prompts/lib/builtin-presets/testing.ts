import { PRECEDENCE, type BuiltinPreset } from "./types";

export const testing: BuiltinPreset = {
  id: "builtin-testing",
  name: "Testing",
  description: "Writing the tests, where a test that cannot fail is worse than none.",
  sortOrder: 8,
  template: `You are writing tests for {{project_name}}.

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
- Read the existing tests first and follow their layout, naming and helpers.
- Test the behavior a user or caller depends on, not the implementation's internals.
- Cover the edge cases that actually break: empty, missing, duplicate, out of order, failure.
- Make each test able to fail — check it fails before the fix and passes after.
- Do not weaken an assertion or delete a test to make a suite go green.
- Do not change the code under test unless the task asked for it.

When finished:
- List the tests you added and what each one pins down.
- Report the run: what passed, what failed, what you skipped and why.
- Name anything you could not cover.

${PRECEDENCE}
`
};
