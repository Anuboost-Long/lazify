import { translation } from "../../../renderer/i18n/translation";
import { bare, field, type ContextType } from "./types";

/**
 * How something is run here: `To run the tests: yarn test`.
 *
 * Separate from a rule because it answers "how", not "must". An agent that
 * guesses the test command wastes a run finding out it was wrong.
 */
export const commandType: ContextType = {
  id: "command",
  label: translation.PromptBuilder.TypeCommand,
  description: translation.PromptBuilder.TypeCommandDesc,
  section: "context",
  fields: [
    {
      name: "purpose",
      label: translation.PromptBuilder.FieldPurpose,
      placeholder: translation.PromptBuilder.FieldPurposePlaceholder,
      kind: "text",
      required: true
    },
    {
      name: "command",
      label: translation.PromptBuilder.FieldCommand,
      placeholder: translation.PromptBuilder.FieldCommandPlaceholder,
      kind: "text",
      required: true
    }
  ],
  render: (payload) => {
    const purpose = bare(field(payload, "purpose"));
    const command = bare(field(payload, "command"));

    if (!purpose || !command) return "";

    return `To ${purpose}: \`${command}\``;
  }
};
