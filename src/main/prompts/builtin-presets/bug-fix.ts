import { PRECEDENCE, type BuiltinPreset } from "./types";

export const bugFix: BuiltinPreset = {
  id: "builtin-bug-fix",
  name: "Bug Fix",
  description: "Something is broken. Find the cause before changing anything.",
  sortOrder: 2,
  template: `You are fixing a bug in {{project_name}}.

Issue:
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
- Reproduce or understand the issue first.
- Identify the underlying cause before modifying code.
- Do not apply unrelated changes.
- Prefer the smallest safe fix.
- Preserve existing behavior outside the affected area.
- Check related code for the same mistake.

When finished:
- Explain the root cause.
- Explain the fix.
- List the files you changed.
- Describe how you verified the fix.

${PRECEDENCE}
`
};
