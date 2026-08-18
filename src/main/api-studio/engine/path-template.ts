import type { PathSyntax } from "../rules/types";
import type { ApiParameter } from "../types";

interface Placeholder {
  name: string;
  constraint: string | null;
  optional: boolean;
}

function readPlaceholder(body: string, syntax: PathSyntax): Placeholder {
  const withoutCatchAll = syntax.catchAllPrefixes.reduce(
    (value, prefix) => (value.startsWith(prefix) ? value.slice(prefix.length) : value),
    body.trim()
  );
  const [declaration, defaultValue] = withoutCatchAll.split("=");
  const separator = syntax.constraintSeparator;
  const [rawName, ...constraints] = separator ? declaration.split(separator) : [declaration];
  const optional = syntax.optionalMarkers.some((marker) => rawName.endsWith(marker));

  return {
    name: syntax.optionalMarkers.reduce(
      (value, marker) => (value.endsWith(marker) ? value.slice(0, -marker.length) : value),
      rawName.trim()
    ),
    constraint: constraints[0]?.split("(")[0].toLowerCase() ?? null,
    optional: optional || defaultValue !== undefined
  };
}

function eachPlaceholder(template: string, syntax: PathSyntax): Array<[string, Placeholder]> {
  return syntax.placeholders.flatMap((pattern) =>
    Array.from(template.matchAll(new RegExp(pattern.source, "g"))).map(
      (match) => [match[0], readPlaceholder(match[1], syntax)] as [string, Placeholder]
    )
  );
}

export function substituteTokens(
  template: string,
  syntax: PathSyntax,
  containerName: string,
  actionName: string
): string {
  const container = syntax.containerNameSuffix
    ? containerName.replace(new RegExp(`${syntax.containerNameSuffix}$`), "")
    : containerName;

  return Object.entries(syntax.tokens).reduce((value, [token, marker]) => {
    if (!marker) return value;
    return value.split(marker).join(token === "container" ? container : actionName);
  }, template);
}

export function combineTemplates(
  containerTemplate: string | null,
  actionTemplate: string | null,
  syntax: PathSyntax
): string | null {
  const action = actionTemplate?.trim() ?? "";

  if (action.startsWith("~/")) return action.slice(1);
  if (syntax.absolutePrefixes.some((prefix) => prefix !== "~/" && action.startsWith(prefix))) {
    return action;
  }
  if (!containerTemplate) return action.length > 0 ? `/${action}` : null;

  const base = containerTemplate.replace(/^\/+|\/+$/g, "");

  return action.length > 0 ? `/${base}/${action.replace(/^\/+/, "")}` : `/${base}`;
}

/** Every framework's own placeholder syntax, rewritten to the model's `{name}`. */
export function toCanonicalPath(template: string, syntax: PathSyntax): string {
  const canonical = eachPlaceholder(template, syntax).reduce(
    (value, [raw, placeholder]) => value.split(raw).join(`{${placeholder.name}}`),
    template
  );

  return `/${canonical.split("/").filter((segment) => segment.length > 0).join("/")}`;
}

export function templateParameters(template: string, syntax: PathSyntax): ApiParameter[] {
  return eachPlaceholder(template, syntax).map(([, placeholder]) => ({
    name: placeholder.name,
    location: "path" as const,
    required: !placeholder.optional,
    description: null,
    schemaType: syntax.constraintTypes[placeholder.constraint ?? ""] ?? "string",
    example: null
  }));
}
