export class FlowError extends Error {
	constructor(
		message: string,
		readonly where = "",
	) {
		super(where ? `${where}: ${message}` : message);
		this.name = "FlowError";
	}
}

export class AssertionFailure extends Error {
	constructor(
		message: string,
		readonly details = "",
	) {
		super(message);
		this.name = "AssertionFailure";
	}
}

export class InfrastructureError extends Error {
	constructor(
		message: string,
		readonly details = "",
	) {
		super(message);
		this.name = "InfrastructureError";
	}
}

export class RunCancelled extends Error {
	constructor() {
		super("Run cancelled");
		this.name = "RunCancelled";
	}
}

export function describeError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;

	return JSON.stringify(error) || "Unknown error";
}
