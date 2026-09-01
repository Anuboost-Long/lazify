import zlib from "node:zlib";

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

interface StagedEntry {
	name: Buffer;
	body: Buffer;
	crc: number;
	offset: number;
}

function localHeader(entry: StagedEntry): Buffer {
	const header = Buffer.alloc(30);

	header.writeUInt32LE(LOCAL_SIGNATURE, 0);
	header.writeUInt16LE(20, 4);
	header.writeUInt32LE(entry.crc, 14);
	header.writeUInt32LE(entry.body.length, 18);
	header.writeUInt32LE(entry.body.length, 22);
	header.writeUInt16LE(entry.name.length, 26);

	return header;
}

function centralHeader(entry: StagedEntry): Buffer {
	const header = Buffer.alloc(46);

	header.writeUInt32LE(CENTRAL_SIGNATURE, 0);
	header.writeUInt16LE(20, 4);
	header.writeUInt16LE(20, 6);
	header.writeUInt32LE(entry.crc, 16);
	header.writeUInt32LE(entry.body.length, 20);
	header.writeUInt32LE(entry.body.length, 24);
	header.writeUInt16LE(entry.name.length, 28);
	header.writeUInt32LE(entry.offset, 42);

	return header;
}

/**
 * A zip written byte by byte, so an entry name can be anything — including the
 * traversal a real archiver refuses to produce.
 */
export function storedZip(entries: Record<string, string>): Buffer {
	const staged: StagedEntry[] = [];
	const parts: Buffer[] = [];
	let offset = 0;

	for (const [name, body] of Object.entries(entries)) {
		const entry: StagedEntry = {
			name: Buffer.from(name, "utf8"),
			body: Buffer.from(body, "utf8"),
			crc: zlib.crc32(body),
			offset,
		};

		const header = localHeader(entry);

		parts.push(header, entry.name, entry.body);
		offset += header.length + entry.name.length + entry.body.length;
		staged.push(entry);
	}

	const centralStart = offset;

	for (const entry of staged) {
		const header = centralHeader(entry);

		parts.push(header, entry.name);
		offset += header.length + entry.name.length;
	}

	const end = Buffer.alloc(22);

	end.writeUInt32LE(END_SIGNATURE, 0);
	end.writeUInt16LE(staged.length, 8);
	end.writeUInt16LE(staged.length, 10);
	end.writeUInt32LE(offset - centralStart, 12);
	end.writeUInt32LE(centralStart, 16);
	parts.push(end);

	return Buffer.concat(parts);
}
