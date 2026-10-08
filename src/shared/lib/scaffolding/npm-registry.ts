export interface NpmPackageSearchResult {
	name: string;
	version: string;
	description: string;
	keywords: string[];
	publisher: string | null;
}

export interface RegistrySearchResponse {
	objects?: Array<{
		package: {
			name: string;
			version: string;
			description?: string;
			keywords?: string[];
			publisher?: {
				username?: string;
			};
		};
	}>;
}

export interface NpmCliSearchEntry {
	name?: string;
	version?: string;
	description?: string;
	keywords?: string[] | string;
	author?:
		| {
				name?: string;
		  }
		| string;
	maintainers?: Array<{
		username?: string;
	}>;
}
