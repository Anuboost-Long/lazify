import { parseScalar, unescapeDoubleQuoted } from "./scalars";

const PLAIN_TERMINATORS = new Set([",", "]", "}", ":"]);

class FlowReader {
  private position = 0;

  constructor(
    private readonly text: string,
    private readonly lineNumber: number
  ) {}

  fail(message: string): never {
    throw new Error(`Line ${this.lineNumber}: ${message}`);
  }

  skipSpaces() {
    while (this.position < this.text.length && /\s/.test(this.text[this.position])) this.position += 1;
  }

  atEnd() {
    return this.position >= this.text.length;
  }

  readValue(): unknown {
    this.skipSpaces();
    const character = this.text[this.position];

    if (character === "[") return this.readSequence();
    if (character === "{") return this.readMapping();
    if (character === '"' || character === "'") return this.readQuoted(character);

    return parseScalar(this.readPlain());
  }

  private readSequence(): unknown[] {
    this.position += 1;
    const items: unknown[] = [];

    for (;;) {
      this.skipSpaces();
      if (this.atEnd()) this.fail("Unterminated flow sequence.");
      if (this.text[this.position] === "]") {
        this.position += 1;
        return items;
      }

      items.push(this.readValue());
      this.skipSpaces();

      if (this.text[this.position] === ",") this.position += 1;
      else if (this.text[this.position] !== "]") this.fail("Expected , or ] in flow sequence.");
    }
  }

  private readMapping(): Record<string, unknown> {
    this.position += 1;
    const entries: Record<string, unknown> = {};

    for (;;) {
      this.skipSpaces();
      if (this.atEnd()) this.fail("Unterminated flow mapping.");
      if (this.text[this.position] === "}") {
        this.position += 1;
        return entries;
      }

      const key = this.readValue();
      this.skipSpaces();

      if (this.text[this.position] !== ":") this.fail("Expected : in flow mapping.");
      this.position += 1;
      entries[String(key)] = this.readValue();
      this.skipSpaces();

      if (this.text[this.position] === ",") this.position += 1;
      else if (this.text[this.position] !== "}") this.fail("Expected , or } in flow mapping.");
    }
  }

  private readQuoted(quote: string): string {
    this.position += 1;
    let body = "";

    while (this.position < this.text.length) {
      const character = this.text[this.position];

      if (character === "\\" && quote === '"') {
        body += character + (this.text[this.position + 1] ?? "");
        this.position += 2;
        continue;
      }

      if (character === quote) {
        this.position += 1;
        if (quote === "'" && this.text[this.position] === "'") {
          body += "'";
          this.position += 1;
          continue;
        }

        return quote === '"' ? unescapeDoubleQuoted(body) : body;
      }

      body += character;
      this.position += 1;
    }

    return this.fail("Unterminated quoted value.");
  }

  private readPlain(): string {
    const start = this.position;

    while (this.position < this.text.length && !PLAIN_TERMINATORS.has(this.text[this.position])) {
      this.position += 1;
    }

    return this.text.slice(start, this.position).trim();
  }
}

export function isFlowValue(text: string): boolean {
  return text.startsWith("[") || text.startsWith("{");
}

export function parseFlowValue(text: string, lineNumber: number): unknown {
  const reader = new FlowReader(text, lineNumber);
  const value = reader.readValue();
  reader.skipSpaces();

  if (!reader.atEnd()) {
    throw new Error(`Line ${lineNumber}: unexpected content after a flow value.`);
  }

  return value;
}
