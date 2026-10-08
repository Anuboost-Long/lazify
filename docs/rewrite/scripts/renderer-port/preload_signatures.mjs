import fs from "node:fs";
import path from "node:path";
import ts from "/Users/anuboost/Work/lazify-chain/node_modules/typescript/lib/typescript.js";

const dir = "/Users/anuboost/Work/lazify/src/preload/api";
const members = [];
const imports = new Map();
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".ts") && !["index.ts", "subscribe.ts"].includes(name))) {
	const source = ts.createSourceFile(file, fs.readFileSync(path.join(dir, file), "utf8"), ts.ScriptTarget.Latest, true);
	for (const statement of source.statements) {
		if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly !== false) {
			const from = statement.moduleSpecifier.text;
			const named = statement.importClause?.namedBindings;
			if (named && ts.isNamedImports(named)) for (const element of named.elements) imports.set(element.name.text, { from, original: (element.propertyName ?? element.name).text });
		}
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			const object = declaration.initializer;
			if (!object || !ts.isObjectLiteralExpression(object)) continue;
			for (const property of object.properties) {
				if (!ts.isPropertyAssignment(property)) continue;
				const name = property.name.getText(source);
				const value = property.initializer;
				const docs = ts.getJSDocCommentsAndTags(property).map((doc) => doc.getText(source)).join("\n");
				if (ts.isArrowFunction(value)) {
					const params = value.parameters.map((parameter) => parameter.getText(source)).join(", ");
					let returns = value.type ? value.type.getText(source) : null;
					if (!returns) {
						const body = value.body.getText(source);
						if (body.includes("ipcRenderer.invoke")) returns = "Promise<any>";
						else if (body.includes("subscribe(")) returns = "() => void";
						else if (body.includes("ipcRenderer.send")) returns = "void";
						else returns = "unknown";
					}
					members.push({ file, name, kind: "function", signature: `(${params}) => ${returns}`, docs });
				} else {
					members.push({ file, name, kind: "value", signature: value.getText(source), docs });
				}
			}
		}
	}
}
fs.writeFileSync(process.argv[2], JSON.stringify({ members, imports: Object.fromEntries(imports) }, null, 2));
console.log(members.length, "members");
const byFile = {};
for (const member of members) byFile[member.file] = (byFile[member.file] ?? 0) + 1;
console.log(byFile);
console.log(members.filter((member) => member.kind === "value"));
