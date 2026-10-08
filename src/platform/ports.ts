import { desktop } from "@chain/sdk";

export function isPortFree(port: number): Promise<boolean> {
	return desktop.ports.isFree(port);
}
