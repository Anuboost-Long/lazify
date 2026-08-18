import {
  bracketBalance,
  findAnnotation,
  hasAnnotation,
  isAnnotationLine,
  readAnnotations,
  stringValue,
  type Annotation
} from "../reading/annotations";
import {
  readBaseTypes,
  readClassName,
  readDocSummary,
  readMethodDeclaration
} from "../reading/declarations";
import type { AnnotationRules, FrameworkRules } from "../rules/types";
import type { HttpMethod, RouteSecurity } from "../types";
import { bindSignature } from "./parameter-binding";
import {
  combineTemplates,
  substituteTokens,
  templateParameters,
  toCanonicalPath
} from "./path-template";
import type { FrameworkFileScan, FrameworkRouteDraft } from "./route-drafts";

const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH"]);

interface Container {
  name: string;
  template: string | null;
  authorized: boolean;
}

function templateOf(annotations: Annotation[], names: string[]): string | null {
  for (const name of names) {
    const annotation = findAnnotation(annotations, name);
    const template = annotation ? stringValue(annotation.args[0]) : null;

    if (template !== null) return template;
  }

  return null;
}

function securityOf(
  annotations: Annotation[],
  rules: AnnotationRules,
  containerAuthorized: boolean
): RouteSecurity[] {
  if (hasAnnotation(annotations, rules.auth.anonymous)) return [];
  if (!hasAnnotation(annotations, rules.auth.require) && !containerAuthorized) return [];

  const declared = rules.auth.require
    .map((name) => findAnnotation(annotations, name))
    .find((annotation) => annotation !== null);

  return [
    {
      kind: rules.auth.kind,
      schemeName: declared?.name ?? rules.auth.require[0],
      location: rules.auth.location,
      parameterName: rules.auth.parameterName
    }
  ];
}

function responsesOf(annotations: Annotation[], rules: AnnotationRules) {
  if (!rules.responses) return [];

  return annotations
    .filter((annotation) => annotation.name.replace(/Attribute$/, "") === rules.responses!.annotation)
    .flatMap((annotation) =>
      annotation.args
        .map((argument) => argument.match(rules.responses!.statusPattern))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map((match) => ({ status: match[1] ?? match[2], description: null, mediaTypes: [] }))
    )
    .filter((response) => Boolean(response.status));
}

function isContainer(declaration: string, annotations: Annotation[], rules: AnnotationRules) {
  const baseTypes = readBaseTypes(declaration);

  return (
    hasAnnotation(annotations, rules.container.markers) ||
    hasAnnotation(annotations, rules.container.templateAnnotations) ||
    baseTypes.some((baseType) => rules.container.baseTypes.includes(baseType)) ||
    Boolean(rules.container.nameSuffix && readClassName(declaration)?.endsWith(rules.container.nameSuffix))
  );
}

export function readAnnotationRoutes(
  lines: string[],
  framework: FrameworkRules
): FrameworkFileScan {
  const rules = framework.annotations;
  const routes: FrameworkRouteDraft[] = [];
  const unsupported: FrameworkFileScan["unsupported"] = [];

  if (!rules) return { routes, unsupported };

  let pending: Annotation[] = [];
  let openAnnotationText = "";
  let container: Container | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line.length === 0 || line.startsWith("//")) continue;

    const text = openAnnotationText ? `${openAnnotationText} ${line}` : line;
    openAnnotationText = "";

    if (isAnnotationLine(text, rules.syntax) && bracketBalance(text) > 0) {
      openAnnotationText = text;
      continue;
    }

    const annotationsHere = readAnnotations(text, rules.syntax);

    if (isAnnotationLine(text, rules.syntax) && !/[({]\s*$/.test(text) && !readClassName(text)) {
      const declaresMethod = readMethodDeclaration(lines, index);

      if (!declaresMethod || rules.syntax === "bracket") {
        pending = [...pending, ...annotationsHere];
        continue;
      }
    }

    const annotations = [...pending, ...annotationsHere];
    pending = [];

    if (readClassName(text)) {
      container = isContainer(text, annotations, rules)
        ? {
            name: readClassName(text)!,
            template: templateOf(annotations, rules.container.templateAnnotations),
            authorized: securityOf(annotations, rules, false).length > 0
          }
        : null;
      continue;
    }

    const methodAnnotations = annotations.filter(
      (annotation) => rules.methods[annotation.name.replace(/Attribute$/, "")]
    );

    if (methodAnnotations.length === 0 || !container) continue;

    const method = readMethodDeclaration(lines, index);
    if (!method || method.name === container.name) continue;

    for (const methodAnnotation of methodAnnotations) {
      const httpMethod = rules.methods[methodAnnotation.name.replace(/Attribute$/, "")];
      const actionTemplate =
        stringValue(methodAnnotation.args[0]) ??
        templateOf(annotations, rules.container.templateAnnotations);
      const combined = combineTemplates(container.template, actionTemplate, framework.path);

      if (combined === null) {
        unsupported.push({
          reason: `${container.name}.${method.name} has no route template, so its path comes from conventional routing.`,
          line: index + 1
        });
        continue;
      }

      const template = substituteTokens(combined, framework.path, container.name, method.name);
      const pathParameters = templateParameters(template, framework.path);
      const bound = bindSignature(
        method.signature,
        framework,
        new Set(pathParameters.map((parameter) => parameter.name)),
        BODY_METHODS.has(httpMethod)
      );

      routes.push({
        method: httpMethod,
        path: toCanonicalPath(template, framework.path),
        summary: rules.summary
          ? readDocSummary(lines, index, rules.summary.linePrefix, rules.summary.tag)
          : null,
        line: index + 1,
        parameters: [...pathParameters, ...bound.parameters],
        headers: bound.headers,
        requestBody: bound.requestBody,
        responses: responsesOf(annotations, rules),
        security: securityOf(annotations, rules, container.authorized),
        confidence: "exact"
      });
    }

    index = method.endIndex;
  }

  return { routes, unsupported };
}
