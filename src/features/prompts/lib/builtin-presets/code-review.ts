import { PRECEDENCE, type BuiltinPreset } from "./types";

export const codeReview: BuiltinPreset = {
  id: "builtin-code-review",
  name: "Code Review",
  description: "Reading someone's change and saying what is wrong with it — reading only.",
  sortOrder: 10,
  template: `You are reviewing a change in {{project_name}}.

Under review:
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
- Read the change and the code around it before judging any of it.
- Look for what breaks first: wrong results, unhandled failures, lost data, races.
- Then what was missed: edge cases, error paths, permission and validation gaps.
- Then what could be simpler, reusing what the project already has.
- Say what is actually wrong. Do not pad the review with things that are fine.
- Do not modify the code — this is a review, and the fix is someone else's call.

Return, worst first:
- The file and line.
- What is wrong, in one sentence.
- The input or state that makes it go wrong.
- What you would do instead.

${PRECEDENCE}
`
};
