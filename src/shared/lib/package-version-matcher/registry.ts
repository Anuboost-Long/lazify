export interface RegistryRequest {
	accept: string;
	timeoutMs: number;
}

export type RegistryFetch = (url: string, request: RegistryRequest) => Promise<unknown>;
