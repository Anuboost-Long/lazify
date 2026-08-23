import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-api-docs-"));
const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-doc-project-"));

vi.mock("electron", () => ({
  app: { getPath: () => userDataPath },
  BrowserWindow: class {}
}));

const { saveCustomCollections } = await import("../../../src/main/api-studio/custom-collections");
const { pruneCollectionDocs } = await import("../../../src/main/api-studio/docs");
const {
  collectionDocQuestions,
  gapKey,
  importCollectionDocDraft,
  readCollectionDoc,
  renderCollectionDoc,
  saveCollectionDoc,
  writeCollectionDocBrief
} = await import("../../../src/main/api-studio/docs");
const { renderMarkup } = await import("../../../src/main/api-studio/docs/markup");
const { documentStyles } = await import("../../../src/main/api-studio/docs/render/theme");
const { DEFAULT_THEME } = await import("../../../src/main/api-studio/docs/doc-store");

type CustomCollection = import("../../../src/main/api-studio/custom-collections").CustomCollection;
type CustomRequest = import("../../../src/main/api-studio/custom-collections").CustomRequest;

function request(over: Partial<CustomRequest> = {}): CustomRequest {
  return {
    id: "request-1",
    name: "Create a user",
    routeId: "route_1",
    route: {
      id: "route_1",
      folder: "users",
      workspace: "",
      method: "POST",
      path: "/users",
      summary: "Create a user",
      description: "Creates a user and returns it.",
      operationId: "createUser",
      tags: [],
      servers: ["https://api.example.com"],
      headers: [],
      security: [],
      source: {
        kind: "scanner",
        filePath: "src/routes/users.ts",
        line: 12,
        adapter: "express",
        confidence: "exact"
      },
      firstSeenAt: "2026-08-01T00:00:00.000Z",
      parameters: [
        {
          name: "dryRun",
          location: "query",
          required: false,
          description: null,
          schemaType: "boolean",
          example: null
        }
      ],
      requestBody: null,
      responses: []
    },
    draft: null,
    examples: [
      {
        id: "example-1",
        name: "201 Created",
        status: 201,
        statusText: "Created",
        durationMs: 18,
        headers: [],
        mediaType: "application/json",
        body: '{"id":"usr_1","name":"Ada"}',
        bodyBytes: 27,
        truncated: false,
        receivedAt: "2026-08-20T09:00:00.000Z",
        request: null
      }
    ],
    ...over
  };
}

function collection(over: Partial<CustomCollection> = {}): CustomCollection {
  return {
    id: "collection-1",
    name: "Public API",
    folders: [],
    requests: [request()],
    ...over
  };
}

beforeEach(() => {
  fs.rmSync(path.join(userDataPath, "api-studio-docs.json"), { force: true });
  saveCustomCollections(projectPath, [collection()]);
});

describe("the document a collection carries", () => {
  it("takes what the scan already knows and asks about the rest", () => {
    saveCustomCollections(projectPath, [collection({ requests: [request({ examples: [] })] })]);

    const state = readCollectionDoc(projectPath, "collection-1");

    expect(state?.doc.title).toBe("Public API");
    expect(state?.doc.routes[0].sections.purpose).toBe("Creates a user and returns it.");

    const asked = state?.gaps.map((gap) => gap.sectionId) ?? [];

    expect(asked).toContain("overview");
    expect(asked).toContain("auth");
    expect(asked).toContain("responses");
    expect(asked).toContain("parameters");
    expect(asked).not.toContain("purpose");
  });

  it("stops asking about the response once an example carries one", () => {
    const state = readCollectionDoc(projectPath, "collection-1");

    expect(state?.gaps.some((gap) => gap.sectionId === "responses")).toBe(false);
  });

  it("keeps what was written and drops requests the collection no longer holds", () => {
    const first = readCollectionDoc(projectPath, "collection-1");

    saveCollectionDoc(projectPath, {
      ...first!.doc,
      sections: { ...first!.doc.sections, overview: "Everything a partner can call." },
      routes: first!.doc.routes.map((route) => ({
        ...route,
        sections: { ...route.sections, auth: "Any signed-in user." }
      }))
    });

    saveCustomCollections(projectPath, [collection({ requests: [] })]);

    const after = readCollectionDoc(projectPath, "collection-1");

    expect(after?.doc.sections.overview).toBe("Everything a partner can call.");
    expect(after?.doc.routes).toHaveLength(0);
    expect(after?.gaps.some((gap) => gap.sectionId === "overview")).toBe(false);
  });

  it("brings in a draft an agent wrote, and ignores sections it made up", () => {
    const files = writeCollectionDocBrief(projectPath, "collection-1");

    expect(files && fs.existsSync(files.jobPath)).toBe(true);
    expect(fs.readFileSync(files!.instructionsPath, "utf8")).toContain("request-1");

    fs.writeFileSync(
      files!.answerPath,
      JSON.stringify({
        collection: { overview: "The billing API.", invented: "no" },
        routes: [{ requestId: "request-1", sections: { auth: "Bearer token." } }]
      })
    );

    const result = importCollectionDocDraft(projectPath, "collection-1");

    expect(result?.filled).toBe(2);
    expect(result?.filledKeys).toEqual(["||overview", "request-1||auth"]);
    expect(result?.ignored).toEqual(["invented"]);
    expect(result?.doc.sections.overview).toBe("The billing API.");
    expect(result?.doc.routes[0].writtenBy).toBe("agent");
  });

  it("forgets the document when the collection it belongs to is gone", () => {
    saveCollectionDoc(projectPath, {
      ...readCollectionDoc(projectPath, "collection-1")!.doc,
      sections: { overview: "Everything a partner can call." }
    });

    pruneCollectionDocs(projectPath, []);
    saveCustomCollections(projectPath, [collection()]);

    expect(readCollectionDoc(projectPath, "collection-1")?.doc.sections.overview).toBeUndefined();
  });

  it("renders one document with the route, its parameters and a curl example", () => {
    saveCollectionDoc(projectPath, {
      ...readCollectionDoc(projectPath, "collection-1")!.doc,
      sections: { overview: "Everything a partner can call." },
      baseUrl: "https://api.example.com"
    });

    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).toContain("Public API");
    expect(html).toContain("Everything a partner can call.");
    expect(html).toContain("/users");
    expect(html).toContain("dryRun");
    expect(html).toContain("curl -X POST 'https://api.example.com/users'");
  });

  it("carries the logo and the name it was given onto the cover", () => {
    const logo = "data:image/png;base64,iVBORw0KGgo=";

    saveCollectionDoc(projectPath, {
      ...readCollectionDoc(projectPath, "collection-1")!.doc,
      title: "Partner API",
      theme: { ...readCollectionDoc(projectPath, "collection-1")!.doc.theme, logo }
    });

    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).toContain("<title>Partner API</title>");
    expect(html).toContain(`<img class="logo" src="${logo}"`);
  });

  it("leaves the cover alone when no logo was given", () => {
    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).not.toContain('class="logo"');
    expect(html).toContain("Generated by Lazify");
    expect(html).toContain('class="mark"');
  });

  it("keeps an image out of the document unless it is one", () => {
    saveCollectionDoc(projectPath, {
      ...readCollectionDoc(projectPath, "collection-1")!.doc,
      theme: {
        ...readCollectionDoc(projectPath, "collection-1")!.doc.theme,
        logo: "javascript:alert(1)"
      }
    });

    expect(readCollectionDoc(projectPath, "collection-1")?.doc.theme.logo).toBe("");
  });

  it("never prints a credential a request or a response carried", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";

    saveCustomCollections(projectPath, [
      collection({
        requests: [
          request({
            examples: [
              {
                id: "example-1",
                name: "200 OK",
                status: 200,
                statusText: "OK",
                durationMs: 18,
                headers: [],
                mediaType: "application/json",
                body: `{"data":"${token}","apiKey":"1234567890","name":"Ada","success":true}`,
                bodyBytes: 40,
                truncated: false,
                receivedAt: "2026-08-20T09:00:00.000Z",
                request: {
                  method: "POST",
                  url: "https://api.example.com/users?api_key=1234567890abcdef&page=2",
                  headers: [
                    { name: "Authorization", value: `Bearer ${token}` },
                    { name: "X-API-Key", value: "1234567890" },
                    { name: "Content-Type", value: "application/json" }
                  ],
                  body: '{"username":"ada","password":"hunter2"}',
                  route: request().route,
                  baseUrl: "",
                  fields: {},
                  mode: "json",
                  json: "",
                  entries: [],
                  scripts: { pre: "", post: "" }
                }
              }
            ]
          })
        ]
      })
    ]);

    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).not.toContain(token);
    expect(html).not.toContain("1234567890");
    expect(html).not.toContain("hunter2");
    expect(html).not.toContain("X-API-Key");
    expect(html).not.toContain("api_key=");
    expect(html).toContain("&lt;hidden&gt;");
    expect(html).toContain("Ada");
  });

  it("shows a kept response the way it is read, not the way it arrived", () => {
    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).toContain("{\n  &quot;id&quot;: &quot;usr_1&quot;,\n  &quot;name&quot;: &quot;Ada&quot;\n}");
    expect(html).not.toContain('{&quot;id&quot;:&quot;usr_1&quot;');
  });

  it("draws a code block as one surface, not a box per line", () => {
    const styles = documentStyles(DEFAULT_THEME);
    const inPre = styles.slice(styles.indexOf("pre.doc-code code")).split("}")[0];

    expect(inPre).toContain("border: 0");
    expect(inPre).toContain("background: none");
  });

  it("gives a folder its own heading, description and grouped routes", () => {
    saveCustomCollections(projectPath, [
      collection({
        requests: [],
        folders: [
          { id: "folder-1", name: "Authentication", requests: [request()] }
        ]
      })
    ]);

    const state = readCollectionDoc(projectPath, "collection-1");

    expect(state?.doc.folders).toEqual([
      { id: "folder-1", name: "Authentication", description: "" }
    ]);
    expect(state?.doc.routes[0].folderId).toBe("folder-1");
    expect(
      state?.gaps.some(
        (gap) => gap.folderId === "folder-1" && gap.sectionId === "folder_description"
      )
    ).toBe(true);

    saveCollectionDoc(projectPath, {
      ...state!.doc,
      folders: [
        { id: "folder-1", name: "Authentication", description: "Tokens for the partner gateway." }
      ]
    });

    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).toContain("<h2>Authentication</h2>");
    expect(html).toContain("Tokens for the partner gateway.");
    expect(html).toContain('<span class="verb POST">POST</span>');
    expect(html).toContain('<div class="path-bar"><span class="path mono">/users</span></div>');
    expect(readCollectionDoc(projectPath, "collection-1")?.gaps.some((gap) => gap.folderId)).toBe(
      false
    );
  });

  it("keeps a folder description when an agent writes it", () => {
    saveCustomCollections(projectPath, [
      collection({ requests: [], folders: [{ id: "folder-1", name: "Auth", requests: [request()] }] })
    ]);

    const files = writeCollectionDocBrief(projectPath, "collection-1");

    expect(fs.readFileSync(files!.jobPath, "utf8")).toContain('"folders"');

    fs.writeFileSync(
      files!.answerPath,
      JSON.stringify({ folders: [{ id: "folder-1", description: "Everything about tokens." }] })
    );

    const result = importCollectionDocDraft(projectPath, "collection-1");

    expect(result?.filled).toBe(1);
    expect(result?.doc.folders[0].description).toBe("Everything about tokens.");
  });

  it("turns an open question into something an agent can act on", () => {
    saveCustomCollections(projectPath, [
      collection({
        requests: [request({ route: { ...request().route, description: null, summary: null } })]
      })
    ]);

    const state = readCollectionDoc(projectPath, "collection-1");
    const asked = state!.gaps.find((gap) => gap.sectionId === "purpose");
    const prompt = collectionDocQuestions(projectPath, "collection-1", [gapKey(asked!)]) ?? "";

    expect(prompt).toContain("What does it do for the caller?");
    expect(prompt).toContain("request-1");
    expect(prompt).toContain("POST /users");
    expect(prompt).toContain("src/routes/users.ts:12");
    expect(prompt).toContain(".lazify/api-studio/docs/public-api/doc-draft.json");
    expect(prompt).toContain("Read the source");
    expect(prompt).not.toContain("What is this API for");
  });

  it("can be asked about a blank field that was never a question", () => {
    const prompt =
      collectionDocQuestions(projectPath, "collection-1", ["request-1||behavior"]) ?? "";

    expect(prompt).toContain("Behaviour");
    expect(prompt).toContain("Side effects, ordering, idempotency");
    expect(prompt).toContain("POST /users");
    expect(prompt).toContain('"sections": { "behavior": "…" }');
  });

  it("asks everything at once when nothing is picked", () => {
    saveCustomCollections(projectPath, [
      collection({
        requests: [request({ route: { ...request().route, description: null, summary: null } })]
      })
    ]);

    const prompt = collectionDocQuestions(projectPath, "collection-1", []) ?? "";

    expect(prompt).toContain("What is this API for");
    expect(prompt).toContain("What does it do for the caller?");
  });

  it("fills only what is still empty when answers arrive on their own", () => {
    const first = readCollectionDoc(projectPath, "collection-1");

    saveCollectionDoc(projectPath, {
      ...first!.doc,
      sections: { ...first!.doc.sections, overview: "Mine, written by hand." }
    });

    const files = writeCollectionDocBrief(projectPath, "collection-1");

    fs.writeFileSync(
      files!.answerPath,
      JSON.stringify({
        collection: { overview: "The agent's version.", errors: "A JSON error body." }
      })
    );

    const live = importCollectionDocDraft(projectPath, "collection-1", undefined, true);

    expect(live?.doc.sections.overview).toBe("Mine, written by hand.");
    expect(live?.doc.sections.errors).toBe("A JSON error body.");
    expect(live?.filled).toBe(1);
    expect(live?.filledKeys).toEqual(["||errors"]);

    const taken = importCollectionDocDraft(projectPath, "collection-1");

    expect(taken?.doc.sections.overview).toBe("The agent's version.");
  });

  it("writes nothing when a polled draft holds no new answer", () => {
    const files = writeCollectionDocBrief(projectPath, "collection-1");

    fs.writeFileSync(
      files!.answerPath,
      JSON.stringify({ collection: { overview: "The billing API." } })
    );

    expect(importCollectionDocDraft(projectPath, "collection-1", undefined, true)?.filled).toBe(1);

    const again = importCollectionDocDraft(projectPath, "collection-1", undefined, true);

    expect(again?.filled).toBe(0);
    expect(again?.filledKeys).toEqual([]);
    expect(again?.doc.sections.overview).toBe("The billing API.");
  });

  it("moves the contents links by scrolling, never by navigating", () => {
    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).toContain("scrollIntoView");
    expect(html).toContain("event.preventDefault()");
  });

  it("puts a copy button on every code block, for the reader who wants the command", () => {
    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).toContain('querySelectorAll("pre.doc-code")');
    expect(html).toContain("lazify-doc-copy");
    expect(html).toContain(".code-block .copy");
    expect(html).toContain('aria-label", "Copy"');
  });

  it("names no project inside a document meant to be handed out", () => {
    const html = renderCollectionDoc(projectPath, "collection-1") ?? "";

    expect(html).not.toContain(path.basename(projectPath));
    expect(html).not.toContain(">Project<");
  });

  it("never lets written markup become live markup", () => {
    const html = renderMarkup("Watch out <script>alert(1)</script>\n\n- one\n- two");

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
  });
});
