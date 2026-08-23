import { describe, expect, it } from "vitest";

import { looksPostman } from "../../../src/main/api-studio/scripting/postman-map";
import { runPostResponse } from "../../../src/main/api-studio/scripting/post-response";
import { runPreRequest } from "../../../src/main/api-studio/scripting/pre-request";

function draft() {
  return {
    method: "POST" as const,
    url: "http://localhost/session",
    headers: [{ name: "Content-Type", value: "application/json" }],
    body: '{"name":"Ada"}'
  };
}

function response() {
  return {
    status: 201,
    statusText: "Created",
    durationMs: 18,
    headers: [{ name: "content-type", value: "application/json" }],
    mediaType: "application/json",
    body: '{"data":{"accessToken":"abc123"}}',
    bodyBytes: 32,
    truncated: false
  };
}

describe("recognising a Postman script", () => {
  it("sees the calls a pasted one is made of", () => {
    expect(looksPostman('pm.environment.set("token", "x")')).toBe(true);
    expect(looksPostman("pm.response.code")).toBe(true);
    expect(looksPostman('pm.test("ok", () => {})')).toBe(true);
    expect(looksPostman("pm.sendRequest(url)")).toBe(true);
  });

  it("does not read our own scripts as Postman's", () => {
    expect(looksPostman('lz.env.set("token", "x")')).toBe(false);
    expect(looksPostman("const pm = 1;")).toBe(false);
    expect(looksPostman("// pm is what Postman calls it")).toBe(false);
  });
});

describe("running a script in the Postman dialect", () => {
  it("answers to Postman's names for the response", () => {
    const result = runPostResponse(
      `pm.environment.set("token", pm.response.json().data.accessToken);
       pm.test("was created", () => pm.expect(pm.response.code).toBe(201));
       pm.test("says so", () => pm.expect(pm.response.status).toBe("Created"));
       console.log(pm.response.text(), pm.response.responseTime);`,
      draft(),
      response(),
      {},
      "pm"
    );

    expect(result.run.error).toBeNull();
    expect(result.values).toEqual({ token: "abc123" });
    expect(result.run.checks.every((check) => check.passed)).toBe(true);
    expect(result.run.logs).toEqual(['{"data":{"accessToken":"abc123"}} 18']);
  });

  it("answers to them before the request goes out too", () => {
    const result = runPreRequest(
      `pm.request.headers.set("Authorization", "Bearer " + pm.environment.get("token"));
       pm.request.url = pm.request.url + "?trace=1";`,
      draft(),
      { token: "abc" },
      "pm"
    );

    expect(result.run.error).toBeNull();
    expect(result.draft.headers).toContainEqual({ name: "Authorization", value: "Bearer abc" });
    expect(result.draft.url).toBe("http://localhost/session?trace=1");
  });

  it("keeps lz working for whatever was already written", () => {
    const result = runPostResponse(
      'lz.env.set("kept", lz.response.status);',
      draft(),
      response(),
      {},
      "pm"
    );

    expect(result.run.error).toBeNull();
    expect(result.values).toEqual({ kept: "201" });
  });

  it("leaves pm undefined when the project did not ask for it", () => {
    const result = runPostResponse("lz.log(typeof pm);", draft(), response(), {}, "lz");

    expect(result.run.logs).toEqual(["undefined"]);
  });

  it("does not pretend to carry Postman's chai assertions", () => {
    const result = runPostResponse(
      `pm.test("shape", () => pm.expect(pm.response.code).to.be.a("number"));`,
      draft(),
      response(),
      {},
      "pm"
    );

    expect(result.run.checks[0]).toMatchObject({ name: "shape", passed: false });
  });
});
