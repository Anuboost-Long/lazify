/**
 * The editor and the project scan hand findings to the same agents, so the code
 * that travels with one is built in the one place both can reach.
 */
export {
	findingReference,
	snippetAround,
	type DiagnosticSnippet,
} from "@/shared/lib/linting/finding-snippet";
