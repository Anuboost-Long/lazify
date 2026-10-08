export const REGISTRY = "https://registry.npmjs.org";

export const NETWORK_ERROR = "network-error";

export type RegistryReply = object | 404 | typeof NETWORK_ERROR;

const versions = (entries: Record<string, Record<string, string> | null>) => ({
	"dist-tags": { latest: Object.keys(entries)[0] },
	versions: Object.fromEntries(
		Object.entries(entries).map(([version, peerDependencies]) => [
			version,
			peerDependencies ? { version, peerDependencies } : { version },
		]),
	),
});

export const FAKE_REGISTRY: Record<string, RegistryReply> = {
	[`${REGISTRY}/react-dom/18.2.0`]: { version: "18.2.0", peerDependencies: { react: "^18.2.0" } },
	[`${REGISTRY}/lib-ok/2.2.0`]: { version: "2.2.0", peerDependencies: { react: ">=16.8.0 <19" } },
	[`${REGISTRY}/lib-old/1.0.0`]: { version: "1.0.0", peerDependencies: { react: "^17.0.0" } },
	[`${REGISTRY}/lib-old/latest`]: { version: "3.1.0", peerDependencies: { react: "^18 || ^19" } },
	[`${REGISTRY}/lib-search/1.4.0`]: { version: "1.4.0", peerDependencies: { react: "^16.8.0" } },
	[`${REGISTRY}/lib-search/latest`]: { version: "4.0.0", peerDependencies: { react: "^19.0.0" } },
	[`${REGISTRY}/lib-search`]: versions({
		"4.0.0": { react: "^19.0.0" },
		"3.0.0-rc.1": { react: "^18.0.0" },
		"2.5.0": { react: "^18.0.0" },
		"2.4.0": { react: "^18.0.0" },
		"1.4.0": { react: "^16.8.0" },
	}),
	[`${REGISTRY}/lib-downgrade/5.0.0`]: { version: "5.0.0", peerDependencies: { react: "^19.0.0" } },
	[`${REGISTRY}/lib-downgrade/latest`]: { version: "5.0.0", peerDependencies: { react: "^19.0.0" } },
	[`${REGISTRY}/lib-downgrade`]: versions({
		"5.0.0": { react: "^19.0.0" },
		"4.2.1": { react: "~18.2.0" },
		"4.2.0": null,
	}),
	[`${REGISTRY}/lib-unknown/3.0.0`]: { version: "3.0.0", peerDependencies: { react: "^17.0.0" } },
	[`${REGISTRY}/lib-unknown/latest`]: 404,
	[`${REGISTRY}/lib-unpublished/0.9.0`]: 404,
	[`${REGISTRY}/lib-offline/1.0.0`]: NETWORK_ERROR,
	[`${REGISTRY}/lib-broken-manifest/1.0.0`]: { version: "1.0.0", peerDependencies: { react: "^17.0.0" } },
	[`${REGISTRY}/lib-broken-manifest/latest`]: { version: "2.0.0", peerDependencies: { react: "^19.0.0" } },
	[`${REGISTRY}/lib-broken-manifest`]: { "dist-tags": { latest: "2.0.0" } },
	[`${REGISTRY}/%40scope%2Fui/5.0.0`]: { version: "5.0.0-beta.2", peerDependencies: {} },
	[`${REGISTRY}/%40types%2Freact/18.2.0`]: { version: "18.2.0" },

	[`${REGISTRY}/lib-next-peer/1.0.0`]: { version: "1.0.0", peerDependencies: { react: "^18.0.0" } },
	[`${REGISTRY}/lib-next-peer/latest`]: { version: "1.2.0", peerDependencies: { react: ">=14" } },
	[`${REGISTRY}/react/18.3.1`]: 404,

	[`${REGISTRY}/expo/52.0.11`]: {
		version: "52.0.11",
		dependencies: {
			"expo-router": "~4.0.17",
			"expo-image": "~2.0.3",
			"expo-font": "~13.0.1",
			"react-native": "0.76.3",
		},
	},
	[`${REGISTRY}/lib-rn/1.0.0`]: { version: "1.0.0", peerDependencies: { "react-native": "*" } },
	[`${REGISTRY}/expo/52.0.0`]: NETWORK_ERROR,
	[`${REGISTRY}/expo-router/4.0.0`]: NETWORK_ERROR,

	[`${REGISTRY}/react/18.2.0`]: 404,
	[`${REGISTRY}/rn-lib/2.0.0`]: { version: "2.0.0", peerDependencies: { "react-native": ">=0.75" } },
	[`${REGISTRY}/rn-lib/latest`]: { version: "2.3.0", peerDependencies: { "react-native": ">=0.75" } },
	[`${REGISTRY}/rn-lib`]: versions({
		"2.3.0": { "react-native": ">=0.75" },
		"2.0.0": { "react-native": ">=0.75" },
		"1.9.0": { "react-native": ">=0.70 <0.75" },
	}),
};

export const VERSION_MATCH_CASES: Array<{ name: string; packageJson: object }> = [
	{ name: "no anchor", packageJson: { dependencies: { lodash: "^4.17.21" } } },
	{
		name: "react app",
		packageJson: {
			dependencies: {
				react: "^18.2.0",
				"react-dom": "^18.2.0",
				"lib-ok": "^2.1.0",
				"lib-old": "~1.0.0",
				"lib-search": "1.4.0",
				"lib-downgrade": "^5.0.0",
				"lib-unknown": "^3.0.0",
				"lib-unpublished": "0.9.0",
				"lib-offline": "^1.0.0",
				"lib-broken-manifest": "^1.0.0",
				"local-lib": "file:../local",
				"ws-lib": "workspace:*",
				"gh-lib": "github:someone/lib",
				"relative-lib": "./vendor/lib",
				"@scope/ui": "^5.0.0-beta.2",
			},
			devDependencies: {
				"@types/react": "^18.2.0",
				"lib-ok": "^2.2.0",
			},
		},
	},
	{
		name: "next app",
		packageJson: {
			dependencies: { next: "14.2.3", react: "18.3.1", "lib-next-peer": "1.0.0" },
		},
	},
	{
		name: "expo app",
		packageJson: {
			dependencies: {
				expo: "~52.0.11",
				"react-native": "0.76.3",
				"expo-router": "~4.0.0",
				"expo-image": "~2.0.3",
				"expo-font": "~14.0.0",
				react: "18.3.1",
				"lib-rn": "^1.0.0",
			},
		},
	},
	{
		name: "expo app with the registry offline",
		packageJson: { dependencies: { expo: "52.0.0", "expo-router": "~4.0.0" } },
	},
	{
		name: "react native app",
		packageJson: {
			dependencies: { "react-native": "0.74.1", react: "18.2.0", "rn-lib": "2.0.0" },
		},
	},
	{ name: "empty package.json", packageJson: {} },
];

export const SATISFIES_CASES: Array<[string, string]> = [
	["18.2.0", "^18.0.0"],
	["19.0.0", "^18.0.0"],
	["0.2.5", "^0.2.3"],
	["0.3.0", "^0.2.3"],
	["0.0.4", "^0.0.3"],
	["0.0.3", "^0.0.4"],
	["1.2.9", "~1.2.3"],
	["1.3.0", "~1.2.3"],
	["1.3.5", "~1.2.3"],
	["18.2.0", ">=16.8.0 <19"],
	["19.0.0", ">=16.8.0 <19"],
	["17.0.2", "^16.8.0 || ^17.0.0"],
	["18.0.0", "18"],
	["18.1.0", "18.2"],
	["18.2.0", "18.2"],
	["18.2.0", "18.2.0"],
	["18.2.1", "18.2.0"],
	["5.0.0", "*"],
	["5.0.0", "latest"],
	["5.0.0", ""],
	["^18.2.0", "^18"],
	["14.2.3", ">=14"],
	["14.2.3", ">14.2.3"],
	["14.2.3", "<=14.2.3"],
	["14.2.3", "<14"],
	["1.0.0-beta.1", "^1.0.0"],
];

export const COMPARE_CASES: Array<[string, string]> = [
	["1.0.0", "1.0.0"],
	["1.2.0", "1.10.0"],
	["^2.0.0", "~1.9.9"],
	["1.0.0-rc.1", "1.0.0"],
	["v1.0.0", "1.0.0"],
	["1", "1.0.1"],
];

export const PRE_RELEASE_CASES = ["1.0.0", "1.0.0-rc.1", "^2.0.0-beta", "1.0.0+build.5", "~3.1.4"];
