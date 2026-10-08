import type { ProjectTree } from "../stack-detection/stack-detection.cases";

export const SCRIPT_COMMANDS = [
	"vite",
	"vite --port 4000",
	"vite --port=4100",
	"next dev -p 3001",
	"next dev",
	"PORT=8080 node server.js",
	"cross-env PORT=9000 react-scripts start",
	"react-scripts start",
	"ng serve",
	"npx @angular/cli serve",
	"astro dev",
	"nuxt dev",
	"remix dev",
	"gatsby develop",
	"expo start",
	"vue-cli-service serve",
	"webpack serve",
	"webpack-dev-server --mode development",
	"tsc -w",
	"node index.js -p 80",
	"",
];

const csproj = (sdk: string) =>
	`<Project Sdk="${sdk}">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n  </PropertyGroup>\n</Project>\n`;

const launchSettings = (profiles: Record<string, string>, bom = false) =>
	(bom ? "﻿" : "") +
	JSON.stringify({
		profiles: Object.fromEntries(
			Object.entries(profiles).map(([name, applicationUrl]) => [name, { commandName: "Project", applicationUrl }]),
		),
	});

export const DOTNET_TREES: Array<{ name: string; tree: ProjectTree }> = [
	{ name: "not a dotnet project", tree: { "package.json": "{}" } },
	{
		name: "solution with a web project and BOM launch settings",
		tree: {
			"Shop.sln": "",
			"src/Shop.Api/Shop.Api.csproj": csproj("Microsoft.NET.Sdk.Web"),
			"src/Shop.Api/Properties/launchSettings.json": launchSettings(
				{ http: "http://localhost:5080", https: "https://localhost:7080;http://localhost:5080" },
				true,
			),
			"src/Shop.Domain/Shop.Domain.csproj": csproj("Microsoft.NET.Sdk"),
		},
	},
	{
		name: "project at the root",
		tree: {
			"Site.csproj": csproj("Microsoft.NET.Sdk.Web"),
			"Properties/launchSettings.json": launchSettings({ "Site": "https://0.0.0.0:8080/" }),
		},
	},
	{
		name: "console project without launch settings",
		tree: { "Tool.csproj": csproj("Microsoft.NET.Sdk") },
	},
	{
		name: "unreadable launch settings",
		tree: {
			"Api.csproj": csproj("Microsoft.NET.Sdk.Web"),
			"Properties/launchSettings.json": "{ not json",
		},
	},
	{ name: "solution with no project", tree: { "Empty.sln": "" } },
];

export const DOTNET_SCRIPT_NAMES = [
	"dotnet:run",
	"dotnet:watch",
	"dotnet:build",
	"dotnet:restore",
	"dotnet:test",
	"dotnet:publish",
	"dotnet:clean",
	"dotnet:deploy",
	"dev",
];

export const LSOF_OUTPUT = `COMMAND     PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node      69016 dev       28u  IPv6 0x27338acaa74f51ea      0t0  TCP [::1]:1420 (LISTEN)
node      70001 dev       23u  IPv4 0x1111111111111111      0t0  TCP *:3000 (LISTEN)
node      70001 dev       24u  IPv6 0x2222222222222222      0t0  TCP *:3000 (LISTEN)
dotnet    70100 dev       31u  IPv4 0x3333333333333333      0t0  TCP 127.0.0.1:5080 (LISTEN)
ControlCe   612 dev        9u  IPv4 0x4444444444444444      0t0  TCP *:7000 (LISTEN)
short line
garbage   notapid dev     9u  IPv4 0x5555555555555555      0t0  TCP *:9999 (LISTEN)
`;

export const PS_TREE_OUTPUT = `  PID  PPID
    1     0
  612     1
69000     1
69016 69000
70000     1
70001 70000
70050 70001
70100 70050
not a row
`;

export const PS_COMMAND_OUTPUT = `    1 /sbin/launchd
  612 /System/Library/CoreServices/ControlCenter.app/Contents/MacOS/ControlCenter
69016 node /Users/dev/lazify-chain/node_modules/.bin/vite
70001 node /Users/dev/shop/node_modules/.bin/next dev
70100 dotnet run --project src/Shop.Api/Shop.Api.csproj
garbage
`;
