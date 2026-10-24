import { describe, expect, it } from "vitest";

import { savedTemplateIconOf, stackIconOf } from "@/features/init/lib/stack-icons";

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

describe("savedTemplateIconOf", () => {
	it("uses the logo of the stack a saved template was detected as", () => {
		expect(savedTemplateIconOf("react-next")).toBe("nextjs-original");
		expect(savedTemplateIconOf("react-vite")).toBe("vitejs-plain");
	});
});
