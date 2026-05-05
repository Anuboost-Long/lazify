// @ts-nocheck

// code that TypeScript will ignore

const fs = require("fs");
const path = require("path");
const root = process.cwd();

const Translation = require(path.join(root, "src/renderer/i18n/lang/en.json"));

const Keys = Object.keys(Translation);

let Collection = {};

const toCamelCase = (input = "") => {
  return input
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

for (const layer1 of Keys) {
  const layer1Keys = Object.keys(Translation[layer1]);
  let LayerCollection = {};

  for (const layer2 of layer1Keys) {
    LayerCollection = {
      ...LayerCollection,
      [toCamelCase(layer2)]: `${layer1}.${layer2}`,
    };
  }

  Collection = { ...Collection, [toCamelCase(layer1)]: LayerCollection };
}

const folder = path.join(root, "src/renderer/i18n");
const fileName = path.join(folder, "translation.ts");

const translationContent = `export const translation = ${JSON.stringify(
  Collection,
  null,
  2,
)} as const
`;

fs.writeFile(fileName, translationContent, (error) => {
  if (error) {
    console.log(error);
  }
});
