// Regenerates the member tables in docs/rewrite/02-contract-manifest.md from
// the Electron repo (default: the sibling ../lazify checkout):
//   node docs/rewrite/scripts/generate-contract-manifest.mjs [electron-repo] > /tmp/manifest.md
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(
	process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "../../../../lazify"),
);
const apiDir = join(root, "src/preload/api");
const helperFiles = new Set(["index.ts", "subscribe.ts"]);

const mainSources = readdirSync(join(root, "src/main"), { recursive: true })
	.filter((file) => file.endsWith(".ts"))
	.sort()
	.map((file) => ({
		path: `src/main/${file}`,
		text: readFileSync(join(root, "src/main", file), "utf8"),
	}));

function handlerFiles(channel) {
	const matches = mainSources.filter((source) => source.text.includes(`"${channel}"`));
	return matches.length ? matches.map((source) => source.path).join(", ") : "none found";
}

function membersOf(file) {
	const source = readFileSync(join(apiDir, file), "utf8");
	const starts = [...source.matchAll(/^\t(\w+):\s*(?:\(|[a-z.]+,?$)/gm)];

	return starts.map((start, i) => {
		const body = source.slice(start.index, starts[i + 1]?.index ?? source.length);
		const call = /ipcRenderer\.(invoke|send)\(\s*"([^"]+)"/.exec(body);
		const event = /subscribe\(\s*"([^"]+)"/.exec(body);

		if (call) {
			const kind = call[1] === "invoke" ? "request" : "send (fire-and-forget)";
			return { name: start[1], kind, channel: call[2] };
		}
		if (event) return { name: start[1], kind: "event", channel: event[1] };
		return { name: start[1], kind: "value", channel: null };
	});
}

const groups = readdirSync(apiDir)
	.filter((file) => file.endsWith(".ts") && !helperFiles.has(file))
	.sort()
	.map((file) => ({ group: file.replace(/\.ts$/, ""), members: membersOf(file) }));

const all = groups.flatMap((g) => g.members);
const counts = Object.entries(
	all.reduce((acc, m) => ({ ...acc, [m.kind]: (acc[m.kind] ?? 0) + 1 }), {}),
)
	.map(([kind, count]) => `${count} ${kind}`)
	.join(", ");

function memberRow(m) {
	const channel = m.channel ? `\`${m.channel}\`` : "—";
	const handler = m.channel ? handlerFiles(m.channel) : "preload only";
	return `| \`${m.name}\` | ${m.kind} | ${channel} | ${handler} |`;
}

const lines = [
	`Generated from \`src/preload/api/*.ts\`: ${all.length} members (${counts}).`,
	...groups.flatMap(({ group, members }) => [
		"",
		`### \`${group}\` — \`src/preload/api/${group}.ts\``,
		"",
		"| Member | Kind | Channel | Main-side handler |",
		"| --- | --- | --- | --- |",
		...members.map(memberRow),
	]),
];

process.stdout.write(`${lines.join("\n")}\n`);
