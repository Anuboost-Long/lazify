import type { SecuritySchemeKind } from "../types";

export interface SecurityVariableRule {
  /** Fixed name when every scheme of this kind fills the same variable. */
  variable: string | null;
  /** Otherwise the variable is named after the parameter the value is sent in. */
  nameFromParameter: boolean;
  secret: boolean;
}

export interface EnvironmentPolicy {
  baseUrlVariable: string;
  security: Record<SecuritySchemeKind, SecurityVariableRule>;
  /** A required header the caller must supply becomes a variable of its own. */
  headers: { onlyRequired: boolean; secret: boolean };
}

export const environmentPolicy: EnvironmentPolicy = {
  baseUrlVariable: "baseUrl",

  security: {
    bearer: { variable: "bearerToken", nameFromParameter: false, secret: true },
    oauth2: { variable: "bearerToken", nameFromParameter: false, secret: true },
    openIdConnect: { variable: "bearerToken", nameFromParameter: false, secret: true },
    basic: { variable: "basicAuth", nameFromParameter: false, secret: true },
    apiKey: { variable: null, nameFromParameter: true, secret: true }
  },

  headers: { onlyRequired: true, secret: false }
};
