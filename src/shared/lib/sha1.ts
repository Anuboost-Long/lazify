const rotate = (value: number, bits: number) => (value << bits) | (value >>> (32 - bits));

export function sha1Hex(text: string): string {
	const bytes = new TextEncoder().encode(text);
	const length = bytes.length;
	const blocks = ((length + 8) >>> 6) + 1;
	const words = new Uint32Array(blocks * 16);

	for (let index = 0; index < length; index += 1) {
		words[index >>> 2] |= bytes[index] << (24 - (index % 4) * 8);
	}
	words[length >>> 2] |= 0x80 << (24 - (length % 4) * 8);
	words[blocks * 16 - 1] = length * 8;
	words[blocks * 16 - 2] = Math.floor((length * 8) / 2 ** 32);

	let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
	const schedule = new Uint32Array(80);

	for (let block = 0; block < blocks; block += 1) {
		for (let t = 0; t < 16; t += 1) schedule[t] = words[block * 16 + t];
		for (let t = 16; t < 80; t += 1) {
			schedule[t] = rotate(schedule[t - 3] ^ schedule[t - 8] ^ schedule[t - 14] ^ schedule[t - 16], 1);
		}

		let [a, b, c, d, e] = [h0, h1, h2, h3, h4];

		for (let t = 0; t < 80; t += 1) {
			let mix: number;
			let constant: number;

			if (t < 20) {
				mix = (b & c) | (~b & d);
				constant = 0x5a827999;
			} else if (t < 40) {
				mix = b ^ c ^ d;
				constant = 0x6ed9eba1;
			} else if (t < 60) {
				mix = (b & c) | (b & d) | (c & d);
				constant = 0x8f1bbcdc;
			} else {
				mix = b ^ c ^ d;
				constant = 0xca62c1d6;
			}

			const next = (rotate(a, 5) + mix + e + constant + schedule[t]) >>> 0;
			e = d;
			d = c;
			c = rotate(b, 30) >>> 0;
			b = a;
			a = next;
		}

		h0 = (h0 + a) >>> 0;
		h1 = (h1 + b) >>> 0;
		h2 = (h2 + c) >>> 0;
		h3 = (h3 + d) >>> 0;
		h4 = (h4 + e) >>> 0;
	}

	return [h0, h1, h2, h3, h4].map((word) => word.toString(16).padStart(8, "0")).join("");
}
