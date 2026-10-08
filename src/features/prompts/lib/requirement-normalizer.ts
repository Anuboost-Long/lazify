const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;
const ENDS_SENTENCE = /[.!?:]$/;

/** "add filtering by status" becomes "Add filtering by status." */
export function normalizeRequirement(text: string): string {
  const bare = text.replace(BULLET, "").trim();
  if (!bare) return "";

  const capitalized = bare[0].toUpperCase() + bare.slice(1);
  return ENDS_SENTENCE.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function formatRequirements(items: string[]): string {
  return items
    .map(normalizeRequirement)
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

/**
 * Splits what the user typed into prose and requirements.
 *
 * Bulleted lines become requirements and everything else stays description —
 * a rule, not an interpretation, so the same text always splits the same way.
 * Nothing here rewrites or invents a requirement: that is the user's to write
 * and an agent's to read.
 */
export function splitDescription(text: string): { description: string; requirements: string[] } {
  const description: string[] = [];
  const requirements: string[] = [];

  for (const line of text.split("\n")) {
    if (BULLET.test(line)) requirements.push(line.replace(BULLET, "").trim());
    else description.push(line);
  }

  return { description: description.join("\n").trim(), requirements };
}

/** First line of the description, which stands in when no title was given. */
export function titleFrom(description: string): string {
  const first = description.split("\n").find((line) => line.trim()) ?? "";
  const trimmed = first.trim().replace(BULLET, "");

  return trimmed.length > 80 ? `${trimmed.slice(0, 77).trimEnd()}...` : trimmed;
}
