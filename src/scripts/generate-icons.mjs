import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = new URL("../../", import.meta.url);
const source = await readFile(new URL("build/app-icon.svg", root), "utf8");
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const images = new Map();

for (const size of sizes) {
  const png = await sharp(Buffer.from(source)).resize(size, size).png().toBuffer();
  images.set(size, png);
  await writeFile(new URL(`build/png/icon_${size}x${size}.png`, root), png);
}

await writeFile(new URL("build/icon.png", root), images.get(512));
await writeFile(new URL("website/app/icon.png", root), images.get(512));
await sharp(Buffer.from(source.replace(/ {2}<rect[^>]+\/>\n/, "")))
  .png()
  .toFile(new URL("build/Lazify.icon/Assets/artwork.png", root).pathname);

const icoSizes = [16, 32, 48, 64, 128, 256];
const icoHeader = Buffer.alloc(6 + icoSizes.length * 16);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoSizes.length, 4);
let offset = icoHeader.length;
for (const [index, size] of icoSizes.entries()) {
  const entry = 6 + index * 16;
  icoHeader[entry] = size % 256;
  icoHeader[entry + 1] = size % 256;
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(images.get(size).length, entry + 8);
  icoHeader.writeUInt32LE(offset, entry + 12);
  offset += images.get(size).length;
}
await writeFile(new URL("build/icon.ico", root), Buffer.concat([
  icoHeader,
  ...icoSizes.map((size) => images.get(size)),
]));

const icnsTypes = [[16, "icp4"], [32, "icp5"], [64, "icp6"], [128, "ic07"], [256, "ic08"], [512, "ic09"], [1024, "ic10"]];
const chunks = icnsTypes.map(([size, type]) => {
  const header = Buffer.alloc(8);
  header.write(type);
  header.writeUInt32BE(images.get(size).length + 8, 4);
  return Buffer.concat([header, images.get(size)]);
});
const icnsHeader = Buffer.alloc(8);
icnsHeader.write("icns");
icnsHeader.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
await writeFile(new URL("build/icon.icns", root), Buffer.concat([icnsHeader, ...chunks]));
