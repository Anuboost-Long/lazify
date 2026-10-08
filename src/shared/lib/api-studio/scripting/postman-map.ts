export interface PostmanMember {
  postman: string;
  native: string;
  kind: "namespace" | "method" | "value";
  signature: string | null;
  detail: string;
  phases: Array<"pre" | "post">;
  callOfValue?: boolean;
}

export interface PostmanNamespace {
  postman: string;
  native: string;
  detail: string;
  phases: Array<"pre" | "post">;
  members: PostmanMember[];
}

const BOTH: Array<"pre" | "post"> = ["pre", "post"];

export const POSTMAN_NAMESPACES: PostmanNamespace[] = [
  {
    postman: "environment",
    native: "env",
    detail: "The active environment.",
    phases: BOTH,
    members: [
      {
        postman: "get",
        native: "get",
        kind: "method",
        signature: "(name)",
        detail: "The value of one variable, or null.",
        phases: BOTH
      },
      {
        postman: "set",
        native: "set",
        kind: "method",
        signature: "(name, value)",
        detail: "Keeps a value under this name.",
        phases: BOTH
      },
      {
        postman: "has",
        native: "has",
        kind: "method",
        signature: "(name)",
        detail: "Whether a variable holds anything.",
        phases: BOTH
      },
      {
        postman: "unset",
        native: "unset",
        kind: "method",
        signature: "(name)",
        detail: "Empties a variable.",
        phases: BOTH
      }
    ]
  },
  {
    postman: "response",
    native: "response",
    detail: "What came back.",
    phases: ["post"],
    members: [
      {
        postman: "code",
        native: "status",
        kind: "value",
        signature: null,
        detail: "The status code as a number.",
        phases: ["post"]
      },
      {
        postman: "status",
        native: "statusText",
        kind: "value",
        signature: null,
        detail: 'The status text, such as "OK".',
        phases: ["post"]
      },
      {
        postman: "responseTime",
        native: "durationMs",
        kind: "value",
        signature: null,
        detail: "How long the request took, in milliseconds.",
        phases: ["post"]
      },
      {
        postman: "text",
        native: "body",
        kind: "method",
        signature: "()",
        detail: "The raw body as text.",
        phases: ["post"],
        callOfValue: true
      },
      {
        postman: "json",
        native: "json",
        kind: "method",
        signature: "()",
        detail: "The body parsed as JSON.",
        phases: ["post"]
      },
      {
        postman: "headers",
        native: "headers",
        kind: "namespace",
        signature: null,
        detail: "The headers the server sent back.",
        phases: ["post"]
      }
    ]
  },
  {
    postman: "request",
    native: "request",
    detail: "The request as it stands.",
    phases: BOTH,
    members: [
      {
        postman: "method",
        native: "method",
        kind: "value",
        signature: null,
        detail: "GET, POST, and so on.",
        phases: BOTH
      },
      {
        postman: "url",
        native: "url",
        kind: "value",
        signature: null,
        detail: "The full URL, with every value already filled in.",
        phases: BOTH
      },
      {
        postman: "body",
        native: "body",
        kind: "value",
        signature: null,
        detail: "The encoded body as text, or null.",
        phases: BOTH
      },
      {
        postman: "headers",
        native: "headers",
        kind: "namespace",
        signature: null,
        detail: "The headers this request will be sent with.",
        phases: BOTH
      }
    ]
  }
];

export const POSTMAN_ROOT: PostmanMember[] = [
  {
    postman: "test",
    native: "test",
    kind: "method",
    signature: "(name, () => {})",
    detail: "Records a named check.",
    phases: BOTH
  },
  {
    postman: "expect",
    native: "expect",
    kind: "method",
    signature: "(value)",
    detail: "Starts an assertion. Use it inside a test.",
    phases: BOTH
  }
];

export const POSTMAN_GLOBAL = "pm";

const POSTMAN_TOKEN = /\bpm\s*\.\s*(environment|response|request|test|expect|globals|variables|collectionVariables|sendRequest|info|iterationData|cookies)\b/;

export function looksPostman(source: string): boolean {
  return POSTMAN_TOKEN.test(source);
}
