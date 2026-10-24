import { describe, expect, it } from "vitest";

import { stackIconOf } from "@/features/init/lib/stack-icons";
import { projectStackIconName } from "@/shared/lib/icon-map";

describe("stackIconOf", () => {
	it("shows each catalogued stack with its own logo", () => {
		expect(stackIconOf("next-default")).toBe("nextjs-original");
		expect(stackIconOf("expo-default")).toBe("react-original");
		expect(stackIconOf("vite-react")).toBe("vitejs-plain");
	});

	it("falls back to the React logo for a stack it doesn't know yet", () => {
		expect(stackIconOf("future-stack")).toBe("react-original");
	});
});

describe("projectStackIconName", () => {
	it("uses a real devicon for a detected project stack", () => {
		expect(projectStackIconName("react-next")).toBe("nextjs-original");
		expect(projectStackIconName("react-vite")).toBe("vitejs-plain");
	});
});
