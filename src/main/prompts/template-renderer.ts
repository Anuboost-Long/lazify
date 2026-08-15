export type TemplateValues = Record<string, string>;

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;
const SOLE_PLACEHOLDER = /^\s*\{\{\s*([a-z_]+)\s*\}\}\s*$/;

/**
 * Placeholder substitution, and nothing more.
 *
 * The one thing it does beyond replacing: a placeholder alone on its line that
 * resolves to nothing takes its own line and the heading above it with it. A
 * preset that asks for requirements a task does not have would otherwise render
 * "Requirements:" followed by silence, which reads as a requirement to an agent.
 */
export function renderTemplate(template: string, values: TemplateValues): string {
  const rendered: string[] = [];

  for (const line of template.split("\n")) {
    const sole = SOLE_PLACEHOLDER.exec(line);

    if (sole && !values[sole[1]]?.trim()) {
      if (rendered.at(-1)?.trimEnd().endsWith(":")) rendered.pop();
      continue;
    }

    rendered.push(line.replace(PLACEHOLDER, (_match, name: string) => values[name] ?? ""));
  }

  return `${rendered.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** Every placeholder a template asks for, in the order it asks. */
export function templateVariables(template: string): string[] {
  const found = [...template.matchAll(PLACEHOLDER)].map((match) => match[1]);
  return [...new Set(found)];
}
