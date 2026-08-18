import { stringValue } from "../reading/annotations";
import type { CallRules, FrameworkRules } from "../rules/types";
import type { HttpMethod } from "../types";
import { bindSignature } from "./parameter-binding";
import { templateParameters, toCanonicalPath } from "./path-template";
import type { FrameworkFileScan, FrameworkRouteDraft } from "./route-drafts";

const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH"]);

function callPattern(rules: CallRules) {
  const names = Object.keys(rules.methods).join("|");

  return new RegExp(`(\\w+)\\s*\\.\\s*(${names})\\s*\\(\\s*([^,)]+)`);
}

function groupPattern(rules: CallRules) {
  if (rules.groupCalls.length === 0) return null;

  return new RegExp(
    `(?:var|const|let|RouteGroupBuilder)\\s+(\\w+)\\s*=\\s*(?:(\\w+)\\s*\\.\\s*)?(?:${rules.groupCalls.join("|")})\\s*\\(\\s*([^,)]*)`
  );
}

function readGroupPrefixes(lines: string[], rules: CallRules) {
  const pattern = groupPattern(rules);
  const declared = new Map<string, { parent: string; path: string }>();

  if (!pattern) return new Map<string, string>();

  for (const line of lines) {
    const match = line.match(pattern);
    if (!match) continue;

    declared.set(match[1], { parent: match[2] ?? "", path: stringValue(match[3]) ?? "" });
  }

  const resolve = (name: string, seen: Set<string>): string => {
    const group = declared.get(name);
    if (!group || seen.has(name)) return "";

    seen.add(name);

    return `${resolve(group.parent, seen)}${group.path.replace(/\/+$/, "")}`;
  };

  return new Map(
    Array.from(declared.keys()).map((name) => [name, resolve(name, new Set<string>())])
  );
}

/** A mount such as `app.use("/api", router)` shifts every route the router declares. */
function readMountPrefixes(lines: string[], groupNames: Set<string>) {
  const mounts = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(/\.\s*use\s*\(\s*(["'`][^"'`]*["'`])\s*,\s*(\w+)/);
    const prefix = match ? stringValue(match[1]) : null;

    if (match && prefix && groupNames.has(match[2])) mounts.set(match[2], prefix);
  }

  return mounts;
}

function chained(lines: string[], start: number, calls: string[], chainLines: number) {
  if (calls.length === 0) return false;

  return lines
    .slice(start, start + chainLines)
    .some((line) => calls.some((call) => new RegExp(`\\.\\s*${call}\\s*\\(`).test(line)));
}

/** `router.get(path, requireAuth, handler)` — the guard rides along as an argument. */
function guardedByMiddleware(callText: string, middleware: string[]) {
  return middleware.some((name) => new RegExp(`\\b${name}\\b`).test(callText));
}

function readSummary(lines: string[], start: number, rules: CallRules) {
  for (let index = start; index < lines.length && index < start + rules.chainLines; index += 1) {
    for (const call of rules.summaryCalls) {
      const match = lines[index].match(new RegExp(`\\.\\s*${call}\\s*\\(\\s*("[^"]*")`));
      if (match) return stringValue(match[1]);
    }
  }

  return null;
}

function readHandlerSignature(lines: string[], start: number, chainLines: number) {
  const text = lines.slice(start, start + chainLines).join(" ");
  const arrow = text.indexOf("=>");
  if (arrow === -1) return "";

  const open = text.lastIndexOf("(", arrow);
  const close = text.lastIndexOf(")", arrow);

  return open !== -1 && close > open ? text.slice(open + 1, close) : "";
}

export function readCallRoutes(lines: string[], framework: FrameworkRules): FrameworkFileScan {
  const rules = framework.calls;
  const routes: FrameworkRouteDraft[] = [];
  const unsupported: FrameworkFileScan["unsupported"] = [];

  if (!rules) return { routes, unsupported };

  const groupPrefixes = readGroupPrefixes(lines, rules);
  const mountPrefixes = readMountPrefixes(lines, new Set(groupPrefixes.keys()));
  const pattern = callPattern(rules);

  lines.forEach((line, index) => {
    const match = line.match(pattern);
    const method = match ? rules.methods[match[2]] : undefined;

    if (!match || !method) return;

    const literal = stringValue(match[3]);

    if (literal === null) {
      unsupported.push({
        reason: `${match[2]} is called with a path this scan cannot resolve statically.`,
        line: index + 1
      });
      return;
    }

    const receiver = match[1];
    const prefix = `${mountPrefixes.get(receiver) ?? ""}${groupPrefixes.get(receiver) ?? ""}`;
    const template = `${prefix}/${literal}`;
    const pathParameters = templateParameters(template, framework.path);

    routes.push({
      method,
      path: toCanonicalPath(template, framework.path),
      summary: readSummary(lines, index, rules),
      line: index + 1,
      parameters: pathParameters,
      headers: [],
      requestBody: bindSignature(
        readHandlerSignature(lines, index, rules.chainLines),
        framework,
        new Set(pathParameters.map((parameter) => parameter.name)),
        BODY_METHODS.has(method)
      ).requestBody,
      responses: [],
      security:
        rules.auth &&
        (chained(lines, index, rules.auth.calls, rules.chainLines) ||
          guardedByMiddleware(line.slice(match.index ?? 0), rules.auth.middleware))
          ? [
              {
                kind: rules.auth.kind,
                schemeName: rules.auth.calls[0] ?? rules.auth.middleware[0],
                location: "header" as const,
                parameterName: "Authorization"
              }
            ]
          : [],
      confidence: "inferred"
    });
  });

  return { routes, unsupported };
}
