export type ScriptPhase = "pre" | "post";

export interface ApiNode {
  name: string;
  kind: "namespace" | "method" | "value";
  signature: string | null;
  detail: string;
  phases: ScriptPhase[];
  writable?: boolean;
  members?: ApiNode[];
}

const BOTH: ScriptPhase[] = ["pre", "post"];

export const HEADER_READERS: ApiNode[] = [
  {
    name: "get",
    kind: "method",
    signature: "(name)",
    detail: "The value of one header, or null when it is not set.",
    phases: BOTH
  },
  {
    name: "has",
    kind: "method",
    signature: "(name)",
    detail: "Whether a header is set. Case does not matter.",
    phases: BOTH
  },
  {
    name: "all",
    kind: "method",
    signature: "()",
    detail: "Every header as an array of { name, value }.",
    phases: BOTH
  }
];

export const MATCHERS: ApiNode[] = [
  {
    name: "toBe",
    kind: "method",
    signature: "(expected)",
    detail: "Fails unless the value is exactly this one.",
    phases: BOTH
  },
  {
    name: "toEqual",
    kind: "method",
    signature: "(expected)",
    detail: "Compares objects and arrays by their contents.",
    phases: BOTH
  },
  {
    name: "toContain",
    kind: "method",
    signature: "(text)",
    detail: "Fails unless the value contains this text.",
    phases: BOTH
  },
  {
    name: "toBeTruthy",
    kind: "method",
    signature: "()",
    detail: "Fails on null, undefined, 0, an empty string, or false.",
    phases: BOTH
  },
  {
    name: "toBeFalsy",
    kind: "method",
    signature: "()",
    detail: "The opposite of toBeTruthy.",
    phases: BOTH
  }
];

export const ROOT: ApiNode[] = [
  {
    name: "request",
    kind: "namespace",
    signature: null,
    detail: "The request as it stands. Writable before it is sent, read-only after.",
    phases: BOTH,
    members: [
      {
        name: "method",
        kind: "value",
        signature: null,
        detail: "GET, POST, and so on.",
        phases: BOTH,
        writable: true
      },
      {
        name: "url",
        kind: "value",
        signature: null,
        detail: "The full URL, with the base URL and every value already filled in.",
        phases: BOTH,
        writable: true
      },
      {
        name: "body",
        kind: "value",
        signature: null,
        detail: "The encoded body as text, or null when the request has none.",
        phases: BOTH,
        writable: true
      },
      {
        name: "headers",
        kind: "namespace",
        signature: null,
        detail: "The headers this request will be sent with.",
        phases: BOTH,
        members: [
          ...HEADER_READERS,
          {
            name: "set",
            kind: "method",
            signature: "(name, value)",
            detail: "Adds a header, or replaces the one already there.",
            phases: ["pre"]
          },
          {
            name: "remove",
            kind: "method",
            signature: "(name)",
            detail: "Takes a header off the request.",
            phases: ["pre"]
          }
        ]
      }
    ]
  },
  {
    name: "response",
    kind: "namespace",
    signature: null,
    detail: "What came back. Only a post-response script has one.",
    phases: ["post"],
    members: [
      {
        name: "status",
        kind: "value",
        signature: null,
        detail: "The status code as a number, such as 200.",
        phases: ["post"]
      },
      {
        name: "statusText",
        kind: "value",
        signature: null,
        detail: 'The status text, such as "OK".',
        phases: ["post"]
      },
      {
        name: "body",
        kind: "value",
        signature: null,
        detail: "The raw response body as text.",
        phases: ["post"]
      },
      {
        name: "json",
        kind: "method",
        signature: "()",
        detail: "The body parsed as JSON. Throws when the body is not JSON, so call it inside a test.",
        phases: ["post"]
      },
      {
        name: "mediaType",
        kind: "value",
        signature: null,
        detail: "The content type the server declared, or null.",
        phases: ["post"]
      },
      {
        name: "durationMs",
        kind: "value",
        signature: null,
        detail: "How long the request took, in milliseconds.",
        phases: ["post"]
      },
      {
        name: "headers",
        kind: "namespace",
        signature: null,
        detail: "The headers the server sent back.",
        phases: ["post"],
        members: HEADER_READERS
      }
    ]
  },
  {
    name: "env",
    kind: "namespace",
    signature: null,
    detail: "The active environment. What you set here is kept for every other request.",
    phases: BOTH,
    members: [
      {
        name: "get",
        kind: "method",
        signature: "(name)",
        detail: "The value of one variable, or null when it has none.",
        phases: BOTH
      },
      {
        name: "set",
        kind: "method",
        signature: "(name, value)",
        detail: "Keeps a value under this name, ready for any request to use as a placeholder.",
        phases: BOTH
      },
      {
        name: "has",
        kind: "method",
        signature: "(name)",
        detail: "Whether a variable holds anything.",
        phases: BOTH
      },
      {
        name: "unset",
        kind: "method",
        signature: "(name)",
        detail: "Empties a variable.",
        phases: BOTH
      }
    ]
  },
  {
    name: "test",
    kind: "method",
    signature: "(name, () => {})",
    detail: "Records a named check. It fails when what is inside throws.",
    phases: BOTH
  },
  {
    name: "expect",
    kind: "method",
    signature: "(value)",
    detail: "Starts an assertion. Use it inside a test.",
    phases: BOTH,
    members: MATCHERS
  },
  {
    name: "log",
    kind: "method",
    signature: "(value)",
    detail: "Prints a value under the response, for reading what a script saw.",
    phases: BOTH
  },
  {
    name: "stop",
    kind: "method",
    signature: "(reason)",
    detail: "Stops the request before it is sent, and says why.",
    phases: ["pre"]
  }
];

export function nativeNode(path: string[]): ApiNode | null {
  let nodes: ApiNode[] = ROOT;
  let found: ApiNode | null = null;

  for (const segment of path) {
    found = nodes.find((node) => node.name === segment) ?? null;
    if (!found) return null;

    nodes = found.members ?? [];
  }

  return found;
}

export function membersAt(segments: string[], phase: ScriptPhase, roots: ApiNode[] = ROOT): ApiNode[] {
  let nodes = roots;

  for (const segment of segments) {
    const found = nodes.find((node) => node.name === segment);
    if (!found?.members) return [];

    nodes = found.members;
  }

  return nodes.filter((node) => node.phases.includes(phase));
}

export function rootMembers(phase: ScriptPhase, roots: ApiNode[] = ROOT): ApiNode[] {
  return roots.filter((node) => node.phases.includes(phase));
}

export function membersOf(node: ApiNode, phase: ScriptPhase): ApiNode[] {
  return (node.members ?? []).filter((member) => member.phases.includes(phase));
}

export interface ScriptRecipe {
  title: string;
  phase: ScriptPhase;
  code: (globalName: string) => string;
}

export const RECIPES: ScriptRecipe[] = [
  {
    title: "Keep the token a login returned",
    phase: "post",
    code: (lz) => `${lz}.env.set("token", ${lz}.response.json().accessToken)`
  },
  {
    title: "Send the kept token on this request",
    phase: "pre",
    code: (lz) => `${lz}.request.headers.set("Authorization", \`Bearer \${${lz}.env.get("token")}\`)`
  },
  {
    title: "Check the status and the shape",
    phase: "post",
    code: (lz) =>
      `${lz}.test("returns 200", () => ${lz}.expect(${lz}.response.status).toBe(200))\n` +
      `${lz}.test("has an id", () => ${lz}.expect(${lz}.response.json().id).toBeTruthy())`
  },
  {
    title: "Do not send without a token",
    phase: "pre",
    code: (lz) => `if (!${lz}.env.has("token")) ${lz}.stop("log in first")`
  },
  {
    title: "Read what the script saw",
    phase: "post",
    code: (lz) => `${lz}.log(${lz}.response.status, ${lz}.response.body)`
  }
];
