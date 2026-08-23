import type { RouteSecurity, SecuritySchemeKind } from "../../types";
import { resolveRecord } from "./reference-resolver";
import { asArray, asRecord, asText } from "./values";

const HTTP_SCHEME_KINDS: Record<string, SecuritySchemeKind> = {
  bearer: "bearer",
  basic: "basic"
};

function toRouteSecurity(
  document: Record<string, unknown>,
  schemeName: string
): RouteSecurity | null {
  const schemes = asRecord(asRecord(document.components)?.securitySchemes) ?? {};
  const scheme = resolveRecord(document, schemes[schemeName]);
  if (!scheme) return null;

  const type = asText(scheme.type);

  if (type === "apiKey") {
    const parameterName = asText(scheme.name);
    const location = asText(scheme.in);
    if (!parameterName) return null;

    return {
      kind: "apiKey",
      schemeName,
      location: location === "query" || location === "cookie" ? location : "header",
      parameterName
    };
  }

  if (type === "http") {
    const kind = HTTP_SCHEME_KINDS[asText(scheme.scheme)?.toLowerCase() ?? ""];
    if (!kind) return null;

    return { kind, schemeName, location: "header", parameterName: "Authorization" };
  }

  if (type === "oauth2" || type === "openIdConnect") {
    return { kind: type, schemeName, location: "header", parameterName: "Authorization" };
  }

  return null;
}

export function readOperationSecurity(
  document: Record<string, unknown>,
  operation: Record<string, unknown>
): RouteSecurity[] {
  const requirements = operation.security === undefined ? document.security : operation.security;
  const schemeNames = asArray(requirements).flatMap((requirement) =>
    Object.keys(asRecord(requirement) ?? {})
  );

  const found = new Map<string, RouteSecurity>();

  for (const schemeName of schemeNames) {
    const security = toRouteSecurity(document, schemeName);
    if (security) found.set(schemeName, security);
  }

  return Array.from(found.values());
}
