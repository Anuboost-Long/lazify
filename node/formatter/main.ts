import type { FormatterCall } from "../../src/shared/lib/formatting/worker-protocol";
import { formatFiles } from "./format-files";
import { formatSample } from "./format-sample";
import { readProjectFormatter } from "./project-formatter";

function answer(call: FormatterCall): Promise<unknown> {
	switch (call.command) {
		case "format":
			return formatFiles(call.request);
		case "project-formatter":
			return readProjectFormatter(call.projectPath);
		case "sample":
			return formatSample(call.defaults);
	}
}

try {
	process.stdout.write(JSON.stringify(await answer(JSON.parse(process.argv[2]) as FormatterCall)));
} catch (error) {
	process.stderr.write(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
