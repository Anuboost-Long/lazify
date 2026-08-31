import { Agent, buildConnector } from "undici";

const strictConnector = buildConnector({});
const loopbackConnector = buildConnector({ rejectUnauthorized: false });

export function isLoopbackHost(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

	return (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host === "::1" ||
		host === "0.0.0.0" ||
		/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
	);
}

export const apiRequestDispatcher = new Agent({
	connect(options, callback) {
		const connector = isLoopbackHost(options.hostname ?? "") ? loopbackConnector : strictConnector;

		return connector(options, callback);
	},
});
