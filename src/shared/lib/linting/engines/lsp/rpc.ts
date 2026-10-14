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
	/** Feeds what the server printed; messages are cut out of it by byte count. */
	receive: (chunk: Uint8Array) => void;
}

const HEADER_END = new TextEncoder().encode("\r\n\r\n");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function indexOfHeaderEnd(buffer: Uint8Array): number {
	for (let start = 0; start <= buffer.length - HEADER_END.length; start += 1) {
		if (HEADER_END.every((byte, offset) => buffer[start + offset] === byte)) return start;
	}

	return -1;
}

function concat(left: Uint8Array, right: Uint8Array): Uint8Array {
	const joined = new Uint8Array(left.length + right.length);

	joined.set(left);
	joined.set(right, left.length);

	return joined;
}

export function connect(send: (text: string) => void): RpcConnection {
	const pending = new Map<number, (value: unknown) => void>();
	let nextId = 1;
	let requestHandler: (method: string, params: unknown) => unknown = () => null;
	let notificationHandler: (method: string, params: unknown) => void = () => undefined;

	const write = (message: object) => {
		const body = JSON.stringify({ jsonrpc: "2.0", ...message });

		send(`Content-Length: ${encoder.encode(body).length}\r\n\r\n${body}`);
	};

	let buffer: Uint8Array = new Uint8Array(0);

	function receive(chunk: Uint8Array) {
		buffer = concat(buffer, chunk);

		for (;;) {
			const headerEnd = indexOfHeaderEnd(buffer);

			if (headerEnd === -1) return;

			const length = Number(
				/content-length: (\d+)/i.exec(decoder.decode(buffer.subarray(0, headerEnd)))?.[1],
			);

			if (!Number.isFinite(length)) return;

			const start = headerEnd + HEADER_END.length;

			if (buffer.length < start + length) return;

			const raw = decoder.decode(buffer.subarray(start, start + length));

			buffer = buffer.slice(start + length);

			try {
				dispatch(JSON.parse(raw) as RpcMessage);
			} catch {
				return;
			}
		}
	}

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
		receive,
	};
}
