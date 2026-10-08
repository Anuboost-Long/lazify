import type { SecuritySchemeKind } from "../types";

export interface SecurityVariableRule {
	/** Stands in only when the scheme itself does not name the header it rides in. */
	defaultParameterName: string | null;
	secret: boolean;
	/** Prefix the value carries in an Authorization header, when it uses one. */
	authScheme: string | null;
}

export interface EnvironmentPolicy {
	baseUrlVariable: string;
	security: Record<SecuritySchemeKind, SecurityVariableRule>;
	/** A required header the caller must supply becomes a variable of its own. */
	headers: { onlyRequired: boolean; secret: boolean };
	/** Kinds a project can put in front of every route at once. */
	projectWideKinds: SecuritySchemeKind[];
	/** Whatever a document calls it, this header carries a token, not a key. */
	tokenHeader: string;
}

const bearerRule: SecurityVariableRule = {
	defaultParameterName: "Authorization",
	secret: true,
	authScheme: "Bearer",
};

export const environmentPolicy: EnvironmentPolicy = {
	baseUrlVariable: "baseUrl",

	security: {
		bearer: bearerRule,
		oauth2: bearerRule,
		openIdConnect: bearerRule,
		basic: { defaultParameterName: "Authorization", secret: true, authScheme: "Basic" },
		apiKey: { defaultParameterName: null, secret: true, authScheme: null },
	},

	headers: { onlyRequired: true, secret: false },

	projectWideKinds: ["apiKey"],

	tokenHeader: "authorization",
};
