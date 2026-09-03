import { describe, expect, it } from "vitest";

import { createRedactor } from "../../../src/main/diagnostic-tests/evidence/redact";
import { EvidenceSink } from "../../../src/main/diagnostic-tests/evidence/sink";
import { TerminalCollector } from "../../../src/main/diagnostic-tests/evidence/terminal-collector";

describe("createRedactor", () => {
	it("masks the secret values a run actually resolved", () => {
		const redact = createRedactor(["hunter2000", "s3cr3t-token"]);

		expect(redact("logged in as admin / hunter2000")).toBe("logged in as admin / [redacted]");
		expect(redact("Bearer s3cr3t-token")).toBe("Bearer [redacted]");
	});

	it("masks credentials nobody declared", () => {
		const redact = createRedactor([]);

		expect(redact("authorization: Basic YWRtaW46cGFzcw==")).toBe("authorization: [redacted]");
		expect(redact("password=letmein")).toBe("password: [redacted]");
	});

	it("leaves ordinary output alone", () => {
		const redact = createRedactor(["hunter2000"]);

		expect(redact("GET /api/users 200 in 41ms")).toBe("GET /api/users 200 in 41ms");
	});
});

describe("EvidenceSink", () => {
	it("drops a detail that only repeats its own summary", () => {
		const sink = new EvidenceSink("smoke.yaml");

		sink.add({
			source: "browser-console",
			severity: "error",
			summary: "TypeError: x is not a function",
			details: "TypeError: x is not a function\n    at App.tsx:12",
		});

		expect(sink.all()[0].details).toBe("at App.tsx:12");
	});
});

describe("TerminalCollector", () => {
	it("reports error lines once, without escape sequences", () => {
		const sink = new EvidenceSink("smoke.yaml");
		const collector = new TerminalCollector(sink);

		collector.record("[32mready in 400ms[0m\n");
		collector.record("Error: database connection timeout\n");
		collector.record("Error: database connection timeout\n");
		collector.finish();

		const items = sink.all();

		expect(items).toHaveLength(1);
		expect(items[0].summary).toBe("Error: database connection timeout");
		expect(items[0].source).toBe("terminal");
	});

	it("ties a finding to the step that was running", () => {
		const sink = new EvidenceSink("smoke.yaml");
		const collector = new TerminalCollector(sink);

		sink.stepIndex = 2;
		collector.record("Unhandled promise rejection\n");

		expect(sink.all()[0].stepIndex).toBe(2);
	});
});
