import { readBlockScalar, readBlockScalarIndicator } from "./block-scalar";
import { isFlowValue, parseFlowValue } from "./flow";
import {
  isSequenceItem,
  nextStructuralIndex,
  readYamlLines,
  splitMappingKey,
  type YamlLine
} from "./lines";
import { parseScalar } from "./scalars";

interface ParsedBlock {
  value: unknown;
  nextIndex: number;
}

function unsupported(line: YamlLine, feature: string): never {
  throw new Error(`Line ${line.number}: ${feature} is not supported by the API Studio YAML reader.`);
}

function parseInlineValue(text: string, line: YamlLine): unknown {
  if (text.startsWith("&") || text.startsWith("*")) unsupported(line, "YAML anchors and aliases");
  if (text.startsWith("!")) unsupported(line, "YAML tags");
  if (isFlowValue(text)) return parseFlowValue(text, line.number);

  return parseScalar(text);
}

function parseNestedBlock(lines: YamlLine[], afterIndex: number, parentIndent: number): ParsedBlock {
  const childIndex = nextStructuralIndex(lines, afterIndex);

  if (childIndex >= lines.length) return { value: null, nextIndex: childIndex };

  const child = lines[childIndex];

  if (child.indent > parentIndent) return parseBlock(lines, childIndex, child.indent);
  if (child.indent === parentIndent && isSequenceItem(child.text)) {
    return parseSequence(lines, childIndex, parentIndent);
  }

  return { value: null, nextIndex: afterIndex };
}

function parseMapping(lines: YamlLine[], start: number, indent: number): ParsedBlock {
  const entries: Record<string, unknown> = {};
  let index = start;

  for (;;) {
    index = nextStructuralIndex(lines, index);
    if (index >= lines.length) break;

    const line = lines[index];
    if (line.indent !== indent || isSequenceItem(line.text)) break;

    const entry = splitMappingKey(line.text);
    if (!entry) throw new Error(`Line ${line.number}: expected "key: value".`);
    if (entry.key === "<<") unsupported(line, "YAML merge keys");

    const indicator = readBlockScalarIndicator(entry.valueText);

    if (indicator) {
      const scalar = readBlockScalar(lines, index + 1, indent, indicator);
      entries[entry.key] = scalar.value;
      index = scalar.nextIndex;
      continue;
    }

    if (entry.valueText.length === 0) {
      const nested = parseNestedBlock(lines, index + 1, indent);
      entries[entry.key] = nested.value;
      index = Math.max(nested.nextIndex, index + 1);
      continue;
    }

    entries[entry.key] = parseInlineValue(entry.valueText, line);
    index += 1;
  }

  return { value: entries, nextIndex: index };
}

function parseSequence(lines: YamlLine[], start: number, indent: number): ParsedBlock {
  const items: unknown[] = [];
  let index = start;

  for (;;) {
    index = nextStructuralIndex(lines, index);
    if (index >= lines.length) break;

    const line = lines[index];
    if (line.indent !== indent || !isSequenceItem(line.text)) break;

    const remainder = line.text.slice(1);
    const itemText = remainder.trim();

    if (itemText.length === 0) {
      const nested = parseNestedBlock(lines, index + 1, indent);
      items.push(nested.value);
      index = Math.max(nested.nextIndex, index + 1);
      continue;
    }

    const itemIndent = indent + 1 + (remainder.length - remainder.trimStart().length);
    const opensBlock = isSequenceItem(itemText) || Boolean(splitMappingKey(itemText));

    if (!opensBlock) {
      items.push(parseInlineValue(itemText, line));
      index += 1;
      continue;
    }

    lines[index] = { ...line, indent: itemIndent, text: itemText };
    const parsed = parseBlock(lines, index, itemIndent);
    items.push(parsed.value);
    index = Math.max(parsed.nextIndex, index + 1);
  }

  return { value: items, nextIndex: index };
}

function parseBlock(lines: YamlLine[], start: number, indent: number): ParsedBlock {
  return isSequenceItem(lines[start].text)
    ? parseSequence(lines, start, indent)
    : parseMapping(lines, start, indent);
}

function isDocumentMarker(line: YamlLine) {
  return line.indent === 0 && (line.text === "---" || line.text === "...");
}

function withoutDocumentMarkers(lines: YamlLine[]): YamlLine[] {
  if (lines.filter((line) => line.indent === 0 && line.text === "---").length > 1) {
    throw new Error("Multi-document YAML is not supported.");
  }

  return lines.map((line) => (isDocumentMarker(line) ? { ...line, structural: false } : line));
}

export function parseYamlDocument(source: string): unknown {
  const lines = withoutDocumentMarkers(readYamlLines(source));
  const start = nextStructuralIndex(lines, 0);

  if (start >= lines.length) return null;

  return parseBlock(lines, start, lines[start].indent).value;
}
