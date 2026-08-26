import type { ChildProcess } from "node:child_process";

interface RpcMessage {
	id?: number | string;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: { message?: string };
}

export interface RpcConnection {
	request: (method: string, params?: unknown) => Promise<unknown>;
	notify: (method: string, params?: unknown) => void;
	onRequest: (handler: (method: string, params: unknown) => unknown) => void;
	onNotification: (handler: (method: string, params: unknown) => void) => void;
}

const HEADER_END = "\r\n\r\n";

export function connect(child: ChildProcess): RpcConnection {
	const pending = new Map<number, (value: unknown) => void>();
	let nextId = 1;
	let requestHandler: (method: string, params: unknown) => unknown = () => null;
	let notificationHandler: (method: string, params: unknown) => void = () => undefined;

	const write = (message: object) => {
		const body = JSON.stringify({ jsonrpc: "2.0", ...message });

		child.stdin?.write(`Content-Length: ${Buffer.byteLength(body)}${HEADER_END}${body}`);
	};

	let buffer = Buffer.alloc(0);

	child.stdout?.on("data", (chunk: Buffer) => {
		buffer = Buffer.concat([buffer, chunk]);

		for (;;) {
			const headerEnd = buffer.indexOf(HEADER_END);

			if (headerEnd === -1) return;

			const length = Number(
				/content-length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString())?.[1],
			);

			if (!Number.isFinite(length)) return;

			const start = headerEnd + HEADER_END.length;

			if (buffer.length < start + length) return;

			const raw = buffer.subarray(start, start + length).toString();

			buffer = buffer.subarray(start + length);

			try {
				dispatch(JSON.parse(raw) as RpcMessage);
			} catch {
				return;
			}
		}
	});

	function dispatch(message: RpcMessage) {
		if (message.id !== undefined && message.method) {
			write({ id: message.id, result: requestHandler(message.method, message.params) });
			return;
		}

		if (message.id !== undefined) {
			const resolve = pending.get(Number(message.id));

			pending.delete(Number(message.id));
			resolve?.(message.result);
			return;
		}

		if (message.method) notificationHandler(message.method, message.params);
	}

	return {
		request: (method, params) =>
			new Promise((resolve) => {
				const id = nextId++;

				pending.set(id, resolve);
				write({ id, method, params });
			}),
		notify: (method, params) => write({ method, params }),
		onRequest: (handler) => {
			requestHandler = handler;
		},
		onNotification: (handler) => {
			notificationHandler = handler;
		},
	};
}
