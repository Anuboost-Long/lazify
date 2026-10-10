import { defineConfig } from "rolldown";

export default defineConfig({
	input: "node/formatter/main.ts",
	platform: "node",
	output: { file: "node/formatter/dist/formatter.mjs", format: "esm", codeSplitting: false },
});
