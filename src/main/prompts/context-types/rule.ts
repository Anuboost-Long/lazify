import { translation } from "../../../renderer/i18n/translation";
import { bare, field, sentence, type ContextType } from "./types";

/** How hard a rule binds, in the words the prompt will use. */
export const RULE_STRENGTHS = ["required", "forbidden", "preferred", "discouraged"];

/**
 * The enforced kind: what to do, how strongly, when, and why.
 *
 * Renders as one line — `Use Yarn instead of npm (required), when installing
 * dependencies — the repo has yarn.lock.` — so the instruction, its force and
 * its scope can never be read as each other.
 */
export const ruleType: ContextType = {
  id: "rule",
  label: translation.PromptBuilder.TypeRule,
  description: translation.PromptBuilder.TypeRuleDesc,
  section: "rules",
  fields: [
    {
      name: "strength",
      label: translation.PromptBuilder.FieldStrength,
      placeholder: "",
      kind: "select",
      required: true,
      options: RULE_STRENGTHS
    },
    {
      name: "action",
      label: translation.PromptBuilder.FieldAction,
      placeholder: translation.PromptBuilder.FieldActionPlaceholder,
      kind: "textarea",
      required: true
    },
    {
      name: "condition",
      label: translation.PromptBuilder.FieldCondition,
      placeholder: translation.PromptBuilder.FieldConditionPlaceholder,
      kind: "text"
    },
    {
      name: "reason",
      label: translation.PromptBuilder.FieldReason,
      placeholder: translation.PromptBuilder.FieldReasonPlaceholder,
      kind: "text"
    }
  ],
  render: (payload) => {
    const action = bare(field(payload, "action"));
    if (!action) return "";

    const strength = field(payload, "strength") || "required";
    const condition = bare(field(payload, "condition"));
    const reason = bare(field(payload, "reason"));

    const scope = condition ? `, when ${condition}` : "";
    const why = reason ? ` — ${reason}` : "";

    return `${sentence(action)} (${strength})${scope}${why}.`;
  }
};
