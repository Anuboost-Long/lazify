import { translation } from "../../../renderer/i18n/translation";
import { bare, field, sentence, type ContextType } from "./types";

/** What the project is: `Framework: Next.js`. */
export const factType: ContextType = {
  id: "fact",
  label: translation.PromptBuilder.TypeFact,
  description: translation.PromptBuilder.TypeFactDesc,
  section: "context",
  fields: [
    {
      name: "key",
      label: translation.PromptBuilder.FieldFactKey,
      placeholder: translation.PromptBuilder.FieldFactKeyPlaceholder,
      kind: "text",
      required: true
    },
    {
      name: "value",
      label: translation.PromptBuilder.FieldFactValue,
      placeholder: translation.PromptBuilder.FieldFactValuePlaceholder,
      kind: "text",
      required: true
    }
  ],
  render: (payload) => {
    const key = bare(field(payload, "key"));
    const value = bare(field(payload, "value"));

    if (!key || !value) return "";

    return `${sentence(key)}: ${value}`;
  }
};
