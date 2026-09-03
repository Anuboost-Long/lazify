import type { DiagnosticDriver } from "../drivers/types";
import { InfrastructureError } from "../errors";
import { parseFlow, type ParsedFlow } from "../flow/parse-flow";
import { loadSecretVault, type SecretVault } from "../secrets";
import type { DiagnosticConfig, FlowSource } from "../types";

export interface ValidatedRun {
	flow: ParsedFlow;
	vault: SecretVault;
}

export async function validateRun(
	projectPath: string,
	source: FlowSource,
	config: DiagnosticConfig,
	driver: DiagnosticDriver,
): Promise<ValidatedRun> {
	const flow = parseFlow(source.text);
	const unsupported = flow.capabilities.filter((capability) => !driver.capabilities.has(capability));

	if (unsupported.length > 0) {
		throw new InfrastructureError(
			`The ${driver.platform} driver cannot run: ${unsupported.join(", ")}`,
		);
	}

	const vault = await loadSecretVault(projectPath);
	const missing = vault.missing(flow.requiredSecrets);

	if (missing.length > 0) {
		throw new InfrastructureError(`Missing environment values: ${missing.join(", ")}`);
	}

	vault.register(config.secrets);

	return { flow, vault };
}
