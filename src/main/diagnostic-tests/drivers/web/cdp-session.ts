import type { WebContents } from "electron";

export type CdpParams = Record<string, unknown>;
export type CdpEventListener = (params: CdpParams) => void;

export class CdpSession {
	private readonly listeners = new Map<string, Set<CdpEventListener>>();
	private attached = false;

	constructor(private readonly contents: WebContents) {}

	attach(): void {
		if (this.attached) return;

		this.contents.debugger.attach("1.3");
		this.contents.debugger.on("message", (_event, method, params) => {
			for (const listener of this.listeners.get(method) ?? []) {
				listener((params ?? {}) as CdpParams);
			}
		});

		this.attached = true;
	}

	on(method: string, listener: CdpEventListener): void {
		const existing = this.listeners.get(method);

		if (existing) existing.add(listener);
		else this.listeners.set(method, new Set([listener]));
	}

	send<Result = CdpParams>(method: string, params: CdpParams = {}): Promise<Result> {
		return this.contents.debugger.sendCommand(method, params) as Promise<Result>;
	}

	detach(): void {
		if (!this.attached) return;

		this.attached = false;
		this.listeners.clear();

		try {
			this.contents.debugger.detach();
		} catch {
			/* The page may already be gone; nothing left to detach from. */
		}
	}
}
