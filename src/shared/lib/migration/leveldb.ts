const BLOCK_SIZE = 32 * 1024;
const LOG_HEADER = 7;
const TABLE_MAGIC = [0x57, 0xfb, 0x80, 0x8b, 0x24, 0x75, 0x47, 0xdb];

const enum RecordType {
	Full = 1,
	First = 2,
	Middle = 3,
	Last = 4,
}

const CRC32C_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index += 1) {
		let crc = index;
		for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0x82f63b78 : crc >>> 1;
		table[index] = crc >>> 0;
	}
	return table;
})();

function crc32c(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = CRC32C_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

const unmaskCrc = (masked: number) => {
	const rotated = (masked - 0xa282ead8) >>> 0;
	return ((rotated >>> 17) | (rotated << 15)) >>> 0;
};

const uint32 = (bytes: Uint8Array, at: number) =>
	(bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;

class Cursor {
	constructor(
		readonly bytes: Uint8Array,
		public at = 0,
	) {}

	get done() {
		return this.at >= this.bytes.length;
	}

	varint(): number {
		let result = 0;
		let shift = 0;
		for (;;) {
			if (this.at >= this.bytes.length) throw new Error("truncated varint");
			const byte = this.bytes[this.at];
			this.at += 1;
			result += (byte & 0x7f) * 2 ** shift;
			if ((byte & 0x80) === 0) return result;
			shift += 7;
		}
	}

	take(length: number): Uint8Array {
		if (this.at + length > this.bytes.length) throw new Error("truncated record");
		const slice = this.bytes.subarray(this.at, this.at + length);
		this.at += length;
		return slice;
	}
}

export interface LevelDbEntry {
	key: Uint8Array;
	sequence: number;
	value: Uint8Array | null;
}

interface Fragment {
	type: RecordType;
	data: Uint8Array;
}

function blockFragments(bytes: Uint8Array, block: number): { fragments: Fragment[]; corrupt: boolean } {
	const fragments: Fragment[] = [];
	const end = Math.min(block + BLOCK_SIZE, bytes.length);
	let at = block;

	while (at + LOG_HEADER <= end) {
		const checksum = uint32(bytes, at);
		const length = bytes[at + 4] | (bytes[at + 5] << 8);
		const type = bytes[at + 6];
		if ((type === 0 && length === 0) || at + LOG_HEADER + length > end) break;

		const covered = bytes.subarray(at + 6, at + LOG_HEADER + length);
		if (unmaskCrc(checksum) !== crc32c(covered)) return { fragments, corrupt: true };

		fragments.push({ type: type as RecordType, data: bytes.subarray(at + LOG_HEADER, at + LOG_HEADER + length) });
		at += LOG_HEADER + length;
	}

	return { fragments, corrupt: false };
}

function* logRecords(bytes: Uint8Array): Generator<Uint8Array> {
	let pending: Uint8Array[] = [];

	for (let block = 0; block < bytes.length; block += BLOCK_SIZE) {
		const { fragments, corrupt } = blockFragments(bytes, block);

		for (const { type, data } of fragments) {
			if (type === RecordType.Full) {
				pending = [];
				yield data;
			} else if (type === RecordType.First) {
				pending = [data];
			} else if (pending.length > 0) {
				pending.push(data);
				if (type === RecordType.Last) {
					yield concat(pending);
					pending = [];
				}
			}
		}

		if (corrupt) pending = [];
	}
}

function concat(parts: Uint8Array[]): Uint8Array {
	const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let at = 0;
	for (const part of parts) {
		joined.set(part, at);
		at += part.length;
	}
	return joined;
}

function* writeBatchEntries(batch: Uint8Array): Generator<LevelDbEntry> {
	if (batch.length < 12) return;
	const sequence = uint32(batch, 0) + uint32(batch, 4) * 2 ** 32;
	const count = uint32(batch, 8);
	const cursor = new Cursor(batch, 12);

	for (let index = 0; index < count && !cursor.done; index += 1) {
		const tag = cursor.take(1)[0];
		const key = cursor.take(cursor.varint());
		const value = tag === 1 ? cursor.take(cursor.varint()) : null;
		yield { key, sequence: sequence + index, value };
	}
}

export function readLogFile(bytes: Uint8Array): LevelDbEntry[] {
	const entries: LevelDbEntry[] = [];
	for (const record of logRecords(bytes)) {
		try {
			entries.push(...writeBatchEntries(record));
		} catch {
			continue;
		}
	}
	return entries;
}

export function snappyDecompress(input: Uint8Array): Uint8Array {
	const cursor = new Cursor(input);
	const output = new Uint8Array(cursor.varint());
	let at = 0;

	while (!cursor.done) {
		const tag = cursor.take(1)[0];
		const kind = tag & 3;

		if (kind === 0) {
			let length = tag >>> 2;
			if (length >= 60) {
				const extra = cursor.take(length - 59);
				length = extra.reduce((sum, byte, index) => sum + byte * 2 ** (8 * index), 0);
			}
			output.set(cursor.take(length + 1), at);
			at += length + 1;
			continue;
		}

		let length: number;
		let offset: number;
		if (kind === 1) {
			length = ((tag >>> 2) & 7) + 4;
			offset = ((tag >>> 5) << 8) | cursor.take(1)[0];
		} else if (kind === 2) {
			length = (tag >>> 2) + 1;
			const extra = cursor.take(2);
			offset = extra[0] | (extra[1] << 8);
		} else {
			length = (tag >>> 2) + 1;
			offset = uint32(cursor.take(4), 0);
		}
		if (offset === 0 || offset > at) throw new Error("bad snappy offset");
		for (let index = 0; index < length; index += 1) {
			output[at] = output[at - offset];
			at += 1;
		}
	}

	if (at !== output.length) throw new Error("snappy length mismatch");
	return output;
}

function readBlock(table: Uint8Array, offset: number, size: number): Uint8Array {
	const contents = table.subarray(offset, offset + size);
	const compression = table[offset + size];
	return compression === 1 ? snappyDecompress(contents) : contents;
}

function* blockEntries(block: Uint8Array): Generator<{ key: Uint8Array; value: Uint8Array }> {
	const restarts = uint32(block, block.length - 4);
	const cursor = new Cursor(block.subarray(0, block.length - 4 - restarts * 4));
	let previous: Uint8Array = new Uint8Array(0);

	while (!cursor.done) {
		const shared = cursor.varint();
		const unshared = cursor.varint();
		const valueLength = cursor.varint();
		const key = concat([previous.subarray(0, shared), cursor.take(unshared)]);
		const value = cursor.take(valueLength);
		previous = key;
		yield { key, value };
	}
}

export function readTableFile(table: Uint8Array): LevelDbEntry[] {
	const footer = table.subarray(-48);
	if (!TABLE_MAGIC.every((byte, index) => footer[40 + index] === byte)) throw new Error("not a LevelDB table");

	const handles = new Cursor(footer);
	handles.varint();
	handles.varint();
	const indexOffset = handles.varint();
	const indexSize = handles.varint();

	const entries: LevelDbEntry[] = [];
	for (const { value: handle } of blockEntries(readBlock(table, indexOffset, indexSize))) {
		const position = new Cursor(handle);
		const block = readBlock(table, position.varint(), position.varint());

		for (const { key: internalKey, value } of blockEntries(block)) {
			const trailer = internalKey.subarray(-8);
			const tagged = uint32(trailer, 0) + uint32(trailer, 4) * 2 ** 32;
			const type = tagged % 256;
			entries.push({
				key: internalKey.subarray(0, -8),
				sequence: Math.floor(tagged / 256),
				value: type === 1 ? value : null,
			});
		}
	}
	return entries;
}

export function latestValues(entries: LevelDbEntry[]): Map<string, Uint8Array> {
	const latest = new Map<string, LevelDbEntry>();
	const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

	for (const entry of entries) {
		const id = hex(entry.key);
		const current = latest.get(id);
		if (!current || entry.sequence > current.sequence) latest.set(id, entry);
	}

	const values = new Map<string, Uint8Array>();
	for (const [id, entry] of latest) if (entry.value) values.set(id, entry.value);
	return values;
}

export function readLevelDb(files: Array<{ name: string; bytes: Uint8Array }>): Array<{ key: Uint8Array; value: Uint8Array }> {
	const entries: LevelDbEntry[] = [];
	const keys = new Map<string, Uint8Array>();

	for (const { name, bytes } of files) {
		let found: LevelDbEntry[] = [];
		try {
			if (name.endsWith(".log")) found = readLogFile(bytes);
			else if (name.endsWith(".ldb") || name.endsWith(".sst")) found = readTableFile(bytes);
		} catch {
			found = [];
		}
		for (const entry of found) {
			keys.set(Array.from(entry.key, (byte) => byte.toString(16).padStart(2, "0")).join(""), entry.key);
			entries.push(entry);
		}
	}

	return [...latestValues(entries)].map(([id, value]) => ({ key: keys.get(id)!, value }));
}
