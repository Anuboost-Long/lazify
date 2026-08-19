import { resolveVariable } from "../environment";
import type { ApiVariable } from "../types";

const VARIABLE_TOKEN = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function interpolate(
  text: string,
  variables: ApiVariable[],
  values: Record<string, string>
): string {
  return text.replace(
    VARIABLE_TOKEN,
    (token, name: string) => resolveVariable(variables, values, name) ?? token
  );
}
