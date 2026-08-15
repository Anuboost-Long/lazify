import { translation } from "../../../renderer/i18n/translation";
import { bare, field, type ContextType } from "./types";

/** Where something lives: `src/services — API clients`. */
export const pathType: ContextType = {
  id: "path",
  label: translation.PromptBuilder.TypePath,
  description: translation.PromptBuilder.TypePathDesc,
  section: "context",
  fields: [
    {
      name: "path",
      label: translation.PromptBuilder.FieldPath,
      placeholder: translation.PromptBuilder.FieldPathPlaceholder,
      kind: "text",
      required: true
    },
    {
      name: "holds",
      label: translation.PromptBuilder.FieldHolds,
      placeholder: translation.PromptBuilder.FieldHoldsPlaceholder,
      kind: "text",
      required: true
    }
  ],
  render: (payload) => {
    const location = bare(field(payload, "path"));
    const holds = bare(field(payload, "holds"));

    if (!location || !holds) return "";

    return `${location} — ${holds}`;
  }
};
