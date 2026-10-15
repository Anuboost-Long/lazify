import type { PropertyNaming, SerializationRules } from "../rules/types";

export interface SerializationPolicy {
  naming: PropertyNaming;
  stringEnums: boolean;
}

const CONFIGURATION_HINTS = ["Json", "Naming", "ContractResolver", "EnumConverter"];

function configures(line: string) {
  return CONFIGURATION_HINTS.some((hint) => line.includes(hint));
}

export function readSerializationPolicy(
  sources: string[][],
  rules: SerializationRules | null
): SerializationPolicy {
  if (!rules) return { naming: "pascal", stringEnums: false };

  let naming: PropertyNaming | null = null;
  let stringEnums = false;

  for (const lines of sources) {
    for (const line of lines) {
      if (!configures(line)) continue;

      naming ??= rules.namingPolicies.find((policy) => policy.pattern.test(line))?.naming ?? null;
      stringEnums ||= rules.stringEnums.some((pattern) => pattern.test(line));

      if (naming && stringEnums) return { naming, stringEnums };
    }
  }

  return { naming: naming ?? rules.defaultNaming, stringEnums };
}
