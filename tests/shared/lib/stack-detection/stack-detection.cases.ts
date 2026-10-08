export type ProjectTree = Record<string, string>;

const json = (value: unknown) => JSON.stringify(value, null, 2);

const csproj = (sdk: string, body = "<TargetFramework>net8.0</TargetFramework>") =>
	`<Project Sdk="${sdk}">\n  <PropertyGroup>\n    ${body}\n  </PropertyGroup>\n</Project>\n`;

export const STACK_DETECTION_CASES: Array<{ name: string; tree: ProjectTree }> = [
	{ name: "empty folder", tree: {} },
	{
		name: "vite react app with pnpm",
		tree: {
			"package.json": json({
				scripts: { dev: "vite", build: "tsc && vite build", preview: "vite preview", lint: "eslint ." },
				dependencies: { react: "19.0.0", "react-dom": "19.0.0" },
				devDependencies: { vite: "6.0.0", "@vitejs/plugin-react": "4.3.0" },
			}),
			"pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
			"vite.config.ts": "export default {};\n",
			"index.html": "<!doctype html>\n",
			"src/main.tsx": "",
		},
	},
	{
		name: "next app with yarn and no dev script",
		tree: {
			"package.json": json({
				scripts: { build: "next build" },
				dependencies: { next: "15.0.0", react: "19.0.0", "react-dom": "19.0.0" },
			}),
			"yarn.lock": "",
			"next.config.mjs": "export default {};\n",
			"app/page.tsx": "",
		},
	},
	{
		name: "create react app",
		tree: {
			"package.json": json({
				scripts: { start: "react-scripts start", test: "react-scripts test" },
				dependencies: { react: "18.2.0", "react-dom": "18.2.0", "react-scripts": "5.0.1" },
			}),
			"package-lock.json": "{}",
		},
	},
	{
		name: "expo app with bun",
		tree: {
			"package.json": json({
				scripts: { start: "expo start", android: "expo start --android", ios: "expo start --ios" },
				dependencies: { expo: "52.0.0", "expo-router": "4.0.0", "react-native": "0.76.0", react: "18.3.1" },
			}),
			"bun.lock": "",
			"app.json": json({ expo: { name: "demo" } }),
			"app/index.tsx": "",
		},
	},
	{
		name: "expo app without scripts",
		tree: {
			"package.json": json({ dependencies: { expo: "52.0.0", "react-native": "0.76.0" } }),
			"bun.lockb": "",
		},
	},
	{
		name: "react native cli app with native folders",
		tree: {
			"package.json": json({
				scripts: { start: "react-native start", android: "react-native run-android" },
				dependencies: { "react-native": "0.76.0", react: "18.3.1" },
			}),
			"metro.config.js": "module.exports = {};\n",
			"android/build.gradle": "",
			"ios/Podfile": "platform :ios, '15.0'\n",
			"ios/Demo.xcodeproj/project.pbxproj": "",
			"ios/Demo.xcworkspace/contents.xcworkspacedata": "",
			"ios/Demo/AppDelegate.swift": "import UIKit\n",
		},
	},
	{
		name: "electron app",
		tree: {
			"package.json": json({
				main: "dist/main.js",
				scripts: { "electron:dev": "electron .", "dist:mac": "electron-builder --mac", build: "tsc" },
				devDependencies: { electron: "33.0.0", "electron-builder": "25.0.0" },
			}),
			"package-lock.json": "{}",
			"electron-builder.json": "{}",
		},
	},
	{
		name: "electron app without a start script",
		tree: {
			"package.json": json({ devDependencies: { electron: "33.0.0" } }),
			"package-lock.json": "{}",
		},
	},
	{
		name: "electron with vite and react",
		tree: {
			"package.json": json({
				scripts: { dev: "vite", build: "vite build" },
				dependencies: { react: "19.0.0", "react-dom": "19.0.0" },
				devDependencies: { vite: "6.0.0", electron: "33.0.0" },
			}),
			"package-lock.json": "{}",
			"electron/main.ts": "",
			"vite.config.mjs": "export default {};\n",
		},
	},
	{
		name: "express api",
		tree: {
			"package.json": json({
				scripts: { dev: "node --watch server.js", test: "node --test" },
				dependencies: { express: "4.21.0" },
			}),
			"package-lock.json": "{}",
		},
	},
	{
		name: "fastify api without scripts",
		tree: {
			"package.json": json({ dependencies: { fastify: "5.0.0", "@nestjs/core": "10.0.0" } }),
		},
	},
	{
		name: "bare react",
		tree: {
			"package.json": json({
				scripts: { start: "webpack serve" },
				dependencies: { react: "19.0.0", "react-dom": "19.0.0" },
			}),
			"package-lock.json": "{}",
		},
	},
	{
		name: "bare react without scripts",
		tree: {
			"package.json": json({ dependencies: { react: "19.0.0", "react-dom": "19.0.0" } }),
		},
	},
	{ name: "invalid package.json", tree: { "package.json": "{ broken" } },
	{ name: "package.json holding an array", tree: { "package.json": "[]" } },
	{
		name: "plain node package",
		tree: {
			"package.json": json({ scripts: { build: "tsc" }, dependencies: { lodash: "4.17.21" } }),
			"yarn.lock": "",
		},
	},
	{
		name: "aspnet solution",
		tree: {
			"Shop.sln": "",
			"src/Shop.Api/Shop.Api.csproj": csproj("Microsoft.NET.Sdk.Web"),
			"src/Shop.Domain/Shop.Domain.csproj": csproj("Microsoft.NET.Sdk"),
			"src/Shop.Api/bin/": "",
		},
	},
	{
		name: "blazor project with several target frameworks",
		tree: {
			"Portal.csproj": csproj(
				"Microsoft.NET.Sdk.BlazorWebAssembly",
				"<TargetFrameworks>net9.0;net8.0</TargetFrameworks>",
			),
		},
	},
	{
		name: "maui project",
		tree: {
			"Mobile.csproj": csproj("Microsoft.NET.Sdk", "<UseMaui>true</UseMaui>"),
		},
	},
	{
		name: "fsharp console project",
		tree: {
			"Tool.fsproj": csproj("Microsoft.NET.Sdk"),
		},
	},
	{
		name: "solution with no project file",
		tree: { "Empty.slnx": "" },
	},
	{
		name: "next app vendoring a dotnet sample",
		tree: {
			"package.json": json({
				scripts: { dev: "next dev" },
				dependencies: { next: "15.0.0", react: "19.0.0", "react-dom": "19.0.0" },
			}),
			"package-lock.json": "{}",
			"samples/Demo/Demo.csproj": csproj("Microsoft.NET.Sdk.Web"),
		},
	},
	{
		name: "dotnet project beside a package.json",
		tree: {
			"package.json": json({ scripts: { build: "tailwindcss -o wwwroot/site.css" } }),
			"package-lock.json": "{}",
			"Site.csproj": csproj("Microsoft.NET.Sdk.Web"),
		},
	},
	{
		name: "swift package without ui",
		tree: {
			"Package.swift": '// swift-tools-version:5.9\nimport PackageDescription\n\nlet package = Package(\n    name: "Lint",\n    targets: [.executableTarget(name: "Lint")]\n)\n',
			"Sources/Lint/main.swift": 'print("hello")\n',
		},
	},
	{
		name: "swiftui app",
		tree: {
			"Notes.xcodeproj/project.pbxproj": "",
			"Notes/NotesApp.swift": "import SwiftUI\n\n@main\nstruct NotesApp: App {\n    var body: some Scene { WindowGroup { Text(\"Hi\") } }\n}\n",
		},
	},
	{
		name: "uikit app with cocoapods",
		tree: {
			"Shop.xcodeproj/project.pbxproj": "",
			"Shop.xcworkspace/contents.xcworkspacedata": "",
			Podfile: "platform :ios, '15.0'\n",
			"Shop/AppDelegate.swift": "import UIKit\n\nclass AppDelegate: UIResponder, UIApplicationDelegate {}\n",
			"Pods/Alamofire/Source.swift": "import SwiftUI\n",
		},
	},
	{
		name: "loose swift file at the root",
		tree: { "script.swift": 'print("hi")\n' },
	},
];

export const DIFFERENT_BY_DESIGN = new Set([
	"vite react app with pnpm",
	"next app with yarn and no dev script",
	"create react app",
	"expo app with bun",
	"react native cli app with native folders",
	"electron with vite and react",
	"bare react",
	"bare react without scripts",
	"next app vendoring a dotnet sample",
]);
