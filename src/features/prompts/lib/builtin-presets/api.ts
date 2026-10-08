import { PRECEDENCE, type BuiltinPreset } from "./types";

export const api: BuiltinPreset = {
  id: "builtin-api",
  name: "API",
  description: "Endpoints and contracts, where something is already depending on the shape.",
  sortOrder: 7,
  template: `You are working on the API of {{project_name}}.

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
- Read the neighboring endpoints first and follow the same shape.
- Do not change an existing request or response contract unless the task says to.
- Keep validation, authentication and permission checks at least as strict as they are now.
- Return the error shape this API already returns, with the status codes it already uses.
- Keep the client-side types in step with the contract, in the same change.

When finished:
- State the route, its inputs and its outputs.
- Say whether anything about an existing contract changed, and what calls it.
- List the files you changed.
- Describe how you exercised the endpoint.

${PRECEDENCE}
`
};
