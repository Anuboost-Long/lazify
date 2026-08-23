import { describe, expect, it } from "vitest";

import {
  membersOf,
  rootMembers,
  suggestionsFor
} from "../../../src/renderer/features/api-studio/script-api";

function labels(source: string, phase: "pre" | "post" = "post", globalName = "lz") {
  return suggestionsFor(source, source.length, globalName, phase).items.map((item) => item.label);
}

function offered(source: string, known: Parameters<typeof suggestionsFor>[4]) {
  return suggestionsFor(source, source.length, "lz", "post", known).items;
}

describe("what a script editor can suggest", () => {
  it("offers the global itself while its name is being typed", () => {
    expect(labels("l")).toEqual(["lz"]);
    expect(labels("l", "post", "api")).toEqual([]);
    expect(labels("a", "post", "api")[0]).toBe("api");
  });

  it("offers what sits under the global once a dot is typed", () => {
    expect(labels("lz.")).toContain("response");
    expect(labels("lz.")).toContain("env");
  });

  it("narrows to what the partial name starts", () => {
    expect(labels("lz.re")).toEqual(["request", "response"]);
  });

  it("offers only what the phase can reach", () => {
    expect(labels("lz.", "pre")).toContain("stop");
    expect(labels("lz.", "pre")).not.toContain("response");
    expect(labels("lz.", "post")).not.toContain("stop");
  });

  it("walks into a nested namespace", () => {
    expect(labels("lz.response.")).toContain("json");
    expect(labels("lz.request.headers.", "pre")).toContain("set");
    expect(labels("lz.request.headers.", "post")).not.toContain("set");
  });

  it("offers matchers after an expect closes, and only there", () => {
    expect(labels("lz.expect(lz.response.status).")).toContain("toBe");
    expect(labels("lz.expect(lz.response.status).toBeT")).toEqual(["toBeTruthy"]);
    expect(labels("lz.response.json().")).not.toContain("toBe");
    expect(labels("someCall().")).not.toContain("toBe");
  });

  it("answers to the name the project chose, and to lz either way", () => {
    expect(labels("api.", "post", "api")).toContain("env");
    expect(labels("lz.", "post", "api")).toContain("env");
    expect(labels("pm.", "post", "api")).not.toContain("env");
  });

  it("says nothing when the caret is not in a path", () => {
    expect(labels("const x = 1; ")).toEqual([]);
  });

  it("inserts a call with the caret between its parentheses", () => {
    const { items } = suggestionsFor("lz.env.se", 9, "lz", "post");
    const set = items.find((item) => item.label === "set");

    expect(set).toMatchObject({ insert: "set()", caretBack: 1 });
  });

  it("inserts a no-argument call ready to run", () => {
    const { items } = suggestionsFor("lz.response.js", 14, "lz", "post");

    expect(items[0]).toMatchObject({ label: "json", insert: "json()", caretBack: 0 });
  });
});

const BODY = JSON.stringify({
  data: { accessToken: "abc", user: { id: 7 } },
  message: "ok",
  items: [{ sku: "A1" }]
});

function shapeLabels(source: string) {
  return offered(source, { responseBody: BODY }).map((item) => item.label);
}

describe("what the last response makes suggestable", () => {
  it("offers the fields the body actually came back with", () => {
    expect(shapeLabels("lz.response.json().")).toEqual(["data", "message", "items"]);
    expect(shapeLabels("lz.response.json().data.")).toEqual(["accessToken", "user"]);
  });

  it("follows a name the script gave the parsed body", () => {
    const source = `const jsonData = lz.response.json();\n\nlz.env.set("bearerToken", jsonData.`;

    expect(shapeLabels(source)).toEqual(["data", "message", "items"]);
    expect(shapeLabels(`${source}data.`)).toEqual(["accessToken", "user"]);
  });

  it("looks inside an array at what its first item holds", () => {
    expect(shapeLabels("lz.response.json().items.")).toEqual(["sku"]);
  });

  it("describes each field by what came back in it", () => {
    const items = offered("lz.response.json().data.", { responseBody: BODY });

    expect(items).toEqual([
      { label: "accessToken", signature: null, detail: '"abc"', insert: "accessToken", caretBack: 0 },
      { label: "user", signature: null, detail: "object", insert: "user", caretBack: 0 }
    ]);
  });

  it("falls back to the script's own names when no response has come back yet", () => {
    const source = "const kept = 1;\nlz.response.json().";
    const withoutBody = offered(source, {});

    expect(withoutBody.map((item) => item.label)).toContain("kept");
    expect(withoutBody.map((item) => item.label)).not.toContain("data");
    expect(offered(source, { responseBody: "not json" }).map((item) => item.label)).toContain(
      "kept"
    );
  });

  it("does not mistake an unrelated name for the parsed body", () => {
    expect(shapeLabels("const other = 1;\nother.")).not.toContain("message");
  });
});

describe("what the script itself makes suggestable", () => {
  const script = `const jsonData = lz.response.json();

// Extract the JWT token from the "data" field
if (jsonData.data) {
    lz.env.set("bearerToken", jsonData.`;

  it("offers the names the script uses when nothing else can be resolved", () => {
    expect(labels(script).slice(0, 7)).toEqual([
      "data",
      "env",
      "json",
      "jsonData",
      "lz",
      "response",
      "set"
    ]);
  });

  it("puts the script's own names ahead of what any value answers to", () => {
    const offeredLabels = labels(script);

    expect(offeredLabels.indexOf("jsonData")).toBeLessThan(offeredLabels.indexOf("toString"));
  });

  it("prefers the real response shape when one has come back", () => {
    const shaped = offered(script, { responseBody: JSON.stringify({ data: "jwt", meta: 1 }) });

    expect(shaped.map((item) => item.label)).toEqual(["data", "meta"]);
  });

  it("leaves prose and text out of it", () => {
    const offered = labels(script);

    expect(offered).not.toContain("Extract");
    expect(offered).not.toContain("token");
    expect(offered).not.toContain("bearerToken");
  });

  it("keeps the API list clean where the API is known", () => {
    expect(labels("const jsonData = 1;\nlz.")).toEqual([
      "request",
      "response",
      "env",
      "test",
      "expect",
      "log"
    ]);
  });

  it("offers names beside the global while a bare word is typed", () => {
    expect(labels("const jsonData = 1;\njs")).toEqual(["jsonData"]);
    expect(labels("const jsonData = 1;\nl")).toEqual(["lz"]);
  });

  it("does not offer what JavaScript already means", () => {
    expect(labels("const value = 1;\nco")).toEqual([]);
  });
});

describe("the reference the suggestions are built from", () => {
  it("documents every member it offers", () => {
    const described = (phase: "pre" | "post") =>
      rootMembers(phase).every(
        (node) =>
          node.detail.length > 0 &&
          membersOf(node, phase).every((member) => member.detail.length > 0)
      );

    expect(described("pre")).toBe(true);
    expect(described("post")).toBe(true);
  });

  it("keeps a pre-request script away from the response", () => {
    expect(rootMembers("pre").map((node) => node.name)).not.toContain("response");
    expect(rootMembers("post").map((node) => node.name)).not.toContain("stop");
  });
});

describe("the names an environment holds", () => {
  const known = { variableNames: ["baseUrl", "bearerToken", "tenantId"] };

  it("offers them inside the argument env methods take", () => {
    expect(offered('lz.env.set("', known).map((item) => item.label)).toEqual([
      "baseUrl",
      "bearerToken",
      "tenantId"
    ]);
    expect(offered("lz.env.get('be", known).map((item) => item.label)).toEqual(["bearerToken"]);
    expect(offered('lz.env.has("t', known).map((item) => item.label)).toEqual(["tenantId"]);
  });

  it("replaces only what has been typed inside the quotes", () => {
    const context = suggestionsFor('lz.env.set("bea', 15, "lz", "post", known);

    expect(context.partial).toBe("bea");
    expect(context.items[0]).toMatchObject({ label: "bearerToken", insert: "bearerToken" });
  });

  it("answers under the name the project chose", () => {
    expect(
      suggestionsFor('api.env.get("', 13, "api", "post", known).items.map((item) => item.label)
    ).toEqual(["baseUrl", "bearerToken", "tenantId"]);
  });

  it("stays out of unrelated calls", () => {
    expect(offered('lz.request.headers.set("', known).map((item) => item.label)).not.toContain(
      "bearerToken"
    );
  });
});

describe("what a route says it will return", () => {
  const declaredBody = JSON.stringify({ id: "string", profile: { email: "string" } });

  it("stands in until a real response has come back", () => {
    expect(offered("lz.response.json().", { declaredBody }).map((item) => item.label)).toEqual([
      "id",
      "profile"
    ]);
    expect(
      offered("lz.response.json().profile.", { declaredBody }).map((item) => item.label)
    ).toEqual(["email"]);
  });

  it("gives way to the response that actually arrived", () => {
    const items = offered("lz.response.json().", {
      declaredBody,
      responseBody: JSON.stringify({ id: 1, extra: true })
    });

    expect(items.map((item) => item.label)).toEqual(["id", "extra"]);
  });
});

describe("the headers a route and a response carry", () => {
  const known = {
    requestHeaderNames: ["Authorization", "X-Tenant-Id", "Content-Type"],
    responseHeaderNames: ["content-type", "x-request-id"]
  };

  it("offers what this route declares when a header is being set", () => {
    expect(offered('lz.request.headers.set("', known).map((item) => item.label)).toEqual([
      "Authorization",
      "Content-Type",
      "X-Tenant-Id"
    ]);
    expect(offered('lz.request.headers.set("x-t', known).map((item) => item.label)).toEqual([
      "X-Tenant-Id"
    ]);
  });

  it("offers what came back when a response header is read", () => {
    expect(offered('lz.response.headers.get("', known).map((item) => item.label)).toEqual([
      "content-type",
      "x-request-id"
    ]);
  });

  it("keeps the two sides apart", () => {
    expect(offered('lz.request.headers.get("', known).map((item) => item.label)).not.toContain(
      "x-request-id"
    );
  });

  it("answers under Postman's names too", () => {
    expect(
      suggestionsFor('pm.request.headers.set("', 24, "pm", "pre", known).items.map(
        (item) => item.label
      )
    ).toContain("Authorization");
    expect(
      suggestionsFor('pm.environment.get("', 20, "pm", "post", {
        variableNames: ["bearerToken"]
      }).items.map((item) => item.label)
    ).toEqual(["bearerToken"]);
  });
});

describe("the JavaScript a script may lean on", () => {
  it("offers the global functions the sandbox really has", () => {
    expect(labels("par")).toEqual(["parseInt", "parseFloat"]);
    expect(labels("bto")).toEqual(["btoa"]);
    expect(labels("encodeURI")).toEqual(["encodeURIComponent"]);
  });

  it("walks into the standard namespaces", () => {
    expect(labels("JSON.")).toEqual(["parse", "stringify"]);
    expect(labels("Math.f")).toEqual(["floor"]);
    expect(labels("Object.")).toEqual(["keys", "values", "entries", "assign", "fromEntries"]);
    expect(labels("Number.parse")).toEqual(["parseInt", "parseFloat"]);
    expect(labels("Date.")).toEqual(["now"]);
  });

  it("offers what any value answers to when nothing else is known", () => {
    expect(labels("const value = 1;\nvalue.toS")).toEqual(["toString"]);
    expect(labels("const rows = [];\nrows.fil")).toEqual(["filter"]);
  });

  it("offers them on a resolved shape as well", () => {
    const script = "const jsonData = lz.response.json();\njsonData.data.toS";

    expect(
      offered(script, { responseBody: JSON.stringify({ data: "jwt" }) }).map((item) => item.label)
    ).toEqual(["toString"]);
  });

  it("keeps them out of the way where the API is known", () => {
    expect(labels("lz.")).not.toContain("toString");
    expect(labels("lz.env.")).toEqual(["get", "set", "has", "unset"]);
  });

  it("says nothing more once a name is fully typed", () => {
    expect(labels("btoa")).toEqual([]);
    expect(labels("JSON.stringify")).toEqual([]);
  });
});
