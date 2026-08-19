import { stringValue } from "../reading/annotations";
import type { CallRules, FrameworkRules, ResourceRules } from "../rules/types";
import type { HttpMethod, RouteSecurity } from "../types";
import { readBlockScopes, readGroupPrefixes, readMountPrefixes, type BlockScope } from "./call-groups";
import { bindSignature } from "./parameter-binding";
import { templateParameters, toCanonicalPath } from "./path-template";
import type { FrameworkFileScan, FrameworkRouteDraft } from "./route-drafts";

const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH"]);
const READ_METHODS = new Set<HttpMethod>(["GET", "DELETE", "HEAD", "OPTIONS"]);

function separatorPattern(rules: CallRules) {
  return rules.separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function callPattern(rules: CallRules, names: string[]) {
  return new RegExp(
    `(\\w+)\\s*${separatorPattern(rules)}\\s*(${names.join("|")})\\s*\\(\\s*([^,)]+)`
  );
}

function chained(lines: string[], start: number, calls: string[], chainLines: number) {
  if (calls.length === 0) return false;

  return lines
    .slice(start, start + chainLines)
    .some((line) => calls.some((call) => new RegExp(`\\.\\s*${call}\\s*\\(`).test(line)));
}

/** `router.get(path, requireAuth, handler)` — the guard rides along as an argument. */
function guardedByMiddleware(callText: string, middleware: string[]) {
  return middleware.some((name) => callText.includes(name));
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

/** An arrow function's parameters, or a declaration where the language has one. */
function readHandlerSignature(lines: string[], start: number, rules: CallRules) {
  const text = lines.slice(start, start + rules.chainLines).join(" ");

  if (rules.handlerDeclaration) return text.match(rules.handlerDeclaration)?.[1] ?? "";

  const arrow = text.indexOf("=>");
  if (arrow === -1) return "";

  const open = text.lastIndexOf("(", arrow);
  const close = text.lastIndexOf(")", arrow);

  return open !== -1 && close > open ? text.slice(open + 1, close) : "";
}

/** `@app.route("/x", methods=["GET", "POST"])` declares its methods in an argument. */
function methodsFor(rules: CallRules, name: string, line: string): HttpMethod[] {
  const declared = rules.methods[name];
  if (declared) return [declared];
  if (!rules.methodsArgument) return [];

  const listed = line.match(rules.methodsArgument.pattern)?.[1];
  if (!listed) return rules.methodsArgument.fallback;

  return Array.from(listed.matchAll(/["'`](\w+)["'`]/g))
    .map((match) => match[1].toUpperCase() as HttpMethod)
    .filter((method) => BODY_METHODS.has(method) || READ_METHODS.has(method));
}

function securityFor(
  rules: CallRules,
  lines: string[],
  index: number,
  callText: string,
  secured: boolean
): RouteSecurity[] {
  if (!rules.auth) return [];

  const guarded =
    secured ||
    chained(lines, index, rules.auth.calls, rules.chainLines) ||
    guardedByMiddleware(callText, rules.auth.middleware);

  if (!guarded) return [];

  return [
    {
      kind: rules.auth.kind,
      schemeName: rules.auth.calls[0] ?? rules.auth.middleware[0] ?? "auth",
      location: "header",
      parameterName: "Authorization"
    }
  ];
}

/** One call declaring a whole resource, such as Laravel's `Route::apiResource`. */
function resourceRoutes(
  lines: string[],
  framework: FrameworkRules,
  rules: CallRules,
  scopes: BlockScope[]
): FrameworkRouteDraft[] {
  return rules.resources.flatMap((resource) => {
    const pattern = callPattern(rules, [resource.call]);

    return lines.flatMap((line, index) => {
      const match = line.match(pattern);
      const literal = match ? stringValue(match[3]) : null;

      if (!literal) return [];

      const base = `${scopes[index].prefix}/${literal}`;

      return resource.routes.map((declared) => {
        const template = declared.nested ? `${base}/{${resource.parameter}}` : base;
        const pathParameters = templateParameters(template, framework.path);

        return {
          method: declared.method,
          path: toCanonicalPath(template, framework.path),
          summary: null,
          line: index + 1,
          parameters: pathParameters,
          headers: [],
          requestBody: null,
          responses: [],
          security: securityFor(rules, lines, index, line, scopes[index].secured),
          anonymous: false,
          confidence: "inferred" as const
        };
      });
    });
  });
}

export function readCallRoutes(lines: string[], framework: FrameworkRules): FrameworkFileScan {
  const rules = framework.calls;
  const routes: FrameworkRouteDraft[] = [];
  const unsupported: FrameworkFileScan["unsupported"] = [];

  if (!rules) return { routes, unsupported };

  const groupPrefixes = readGroupPrefixes(lines, rules);
  const mountPrefixes = readMountPrefixes(lines, rules, new Set(groupPrefixes.keys()));
  const scopes = readBlockScopes(lines, rules);
  const pattern = callPattern(rules, [
    ...Object.keys(rules.methods),
    ...(rules.methodsArgument ? ["route"] : [])
  ]);

  lines.forEach((line, index) => {
    const match = line.match(pattern);
    if (!match) return;

    const methods = methodsFor(rules, match[2], line);
    if (methods.length === 0) return;

    const literal = stringValue(match[3]);

    if (literal === null) {
      unsupported.push({
        reason: `${match[2]} is called with a path this scan cannot resolve statically.`,
        line: index + 1
      });
      return;
    }

    const receiver = match[1];
    const mounted = mountPrefixes.get(receiver);
    const declared = mounted?.overrides ? "" : (groupPrefixes.get(receiver) ?? "");
    const prefix = `${mounted?.prefix ?? ""}${declared}${scopes[index].prefix}`;
    const template = `${prefix}/${literal}`;
    const pathParameters = templateParameters(template, framework.path);
    const signature = readHandlerSignature(lines, index, rules);

    for (const method of methods) {
      routes.push({
        method,
        path: toCanonicalPath(template, framework.path),
        summary: readSummary(lines, index, rules),
        line: index + 1,
        parameters: pathParameters,
        headers: [],
        requestBody: bindSignature(
          signature,
          framework,
          new Set(pathParameters.map((parameter) => parameter.name)),
          BODY_METHODS.has(method)
        ).requestBody,
        responses: [],
        security: securityFor(
          rules,
          lines,
          index,
          line.slice(match.index ?? 0),
          scopes[index].secured
        ),
        anonymous: chained(lines, index, rules.auth?.anonymousCalls ?? [], rules.chainLines),
        confidence: "inferred"
      });
    }
  });

  return { routes: [...routes, ...resourceRoutes(lines, framework, rules, scopes)], unsupported };
}
