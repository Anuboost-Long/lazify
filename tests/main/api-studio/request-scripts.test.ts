import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runApiRequest } from "../../../src/main/api-studio/runner/run-request";
import { runPostResponse } from "../../../src/main/api-studio/scripting/post-response";
import { runPreRequest } from "../../../src/main/api-studio/scripting/pre-request";
import type { ApiRequestDraft, ApiResponseSummary } from "../../../src/main/api-studio/runner/types";

let server: http.Server;
let origin: string;

beforeAll(async () => {
  server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          url: request.url,
          authorization: request.headers.authorization ?? "",
          body: Buffer.concat(chunks).toString(),
          accessToken: "token-from-server"
        })
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function draftOf(over: Partial<ApiRequestDraft> = {}): ApiRequestDraft {
  return {
    method: "POST",
    url: "http://example.test/users",
    headers: [{ name: "Content-Type", value: "application/json" }],
    body: '{"name":"Ada"}',
    ...over
  };
}

function responseOf(over: Partial<ApiResponseSummary> = {}): ApiResponseSummary {
  return {
    status: 200,
    statusText: "OK",
    durationMs: 12,
    headers: [{ name: "content-type", value: "application/json" }],
    mediaType: "application/json",
    body: '{"accessToken":"abc123"}',
    bodyBytes: 24,
    truncated: false,
    ...over
  };
}

describe("a pre-request script", () => {
  it("rewrites the request it is given", () => {
    const result = runPreRequest(
      `lz.request.url = lz.request.url + "?trace=1";
       lz.request.headers.set("Authorization", "Bearer " + lz.env.get("token"));
       lz.request.body = JSON.stringify({ name: "Grace" });`,
      draftOf(),
      { token: "abc" }
    );

    expect(result.run.error).toBeNull();
    expect(result.draft.url).toBe("http://example.test/users?trace=1");
    expect(result.draft.headers).toContainEqual({
      name: "Authorization",
      value: "Bearer abc"
    });
    expect(result.draft.body).toBe('{"name":"Grace"}');
  });

  it("fills a placeholder the environment could not resolve", () => {
    const result = runPreRequest(
      `lz.env.set("token", "minted");`,
      draftOf({ headers: [{ name: "Authorization", value: "Bearer {{token}}" }] }),
      {}
    );

    expect(result.draft.headers[0].value).toBe("Bearer minted");
    expect(result.values).toEqual({ token: "minted" });
  });

  it("reports what it set so the environment can keep it", () => {
    const result = runPreRequest(`lz.env.set("requestId", 42);`, draftOf(), {});

    expect(result.values).toEqual({ requestId: "42" });
  });

  it("stops the request when it asks to", () => {
    const result = runPreRequest(`lz.stop("no token yet");`, draftOf(), {});

    expect(result.stopped).toBe("no token yet");
    expect(result.run.error).toBeNull();
  });

  it("reports its own failure instead of throwing", () => {
    const result = runPreRequest(`nothing.here();`, draftOf(), {});

    expect(result.run.error).toContain("nothing");
  });
});

describe("a post-response script", () => {
  it("keeps a value read out of the response", () => {
    const result = runPostResponse(
      `lz.env.set("token", lz.response.json().accessToken);`,
      draftOf(),
      responseOf(),
      {}
    );

    expect(result.run.error).toBeNull();
    expect(result.values).toEqual({ token: "abc123" });
  });

  it("records a check that passed and one that failed", () => {
    const result = runPostResponse(
      `lz.test("returns 200", () => lz.expect(lz.response.status).toBe(200));
       lz.test("is created", () => lz.expect(lz.response.status).toBe(201));`,
      draftOf(),
      responseOf(),
      {}
    );

    expect(result.run.checks).toEqual([
      { name: "returns 200", passed: true, detail: null },
      { name: "is created", passed: false, detail: "Expected 201, got 200" }
    ]);
  });

  it("collects what the script logged", () => {
    const result = runPostResponse(`lz.log("saw", lz.response.status);`, draftOf(), responseOf(), {});

    expect(result.run.logs).toEqual(["saw 200"]);
  });

  it("cannot reach the process it runs in", () => {
    const result = runPostResponse(
      `lz.log(typeof process, typeof require, typeof fetch);`,
      draftOf(),
      responseOf(),
      {}
    );

    expect(result.run.logs).toEqual(["undefined undefined undefined"]);
  });

  it("gives up on a script that never finishes", () => {
    const result = runPostResponse(`for (;;) {}`, draftOf(), responseOf(), {});

    expect(result.run.error).toContain("did not finish");
  });
});

describe("running a request with its scripts", () => {
  it("sends what the pre-request script left behind and reads the response back", async () => {
    const result = await runApiRequest({
      draft: draftOf({ url: `${origin}/users`, body: '{"name":"Ada"}' }),
      scripts: {
        pre: `lz.request.headers.set("Authorization", "Bearer " + lz.env.get("token"));`,
        post: `lz.env.set("nextToken", lz.response.json().accessToken);
               lz.test("returns 200", () => lz.expect(lz.response.status).toBe(200));`
      },
      values: { token: "abc" }
    });

    expect(result.outcome.ok).toBe(true);
    if (!result.outcome.ok) return;

    expect(JSON.parse(result.outcome.response.body)).toMatchObject({
      authorization: "Bearer abc",
      body: '{"name":"Ada"}'
    });
    expect(result.post?.checks).toEqual([{ name: "returns 200", passed: true, detail: null }]);
    expect(result.changedValues).toEqual({ nextToken: "token-from-server" });
  });

  it("does not send when the pre-request script stops it", async () => {
    const result = await runApiRequest({
      draft: draftOf({ url: `${origin}/users` }),
      scripts: { pre: `lz.stop("no token yet");`, post: "" },
      values: {}
    });

    expect(result.outcome).toMatchObject({ ok: false });
    if (result.outcome.ok) return;

    expect(result.outcome.error).toContain("no token yet");
    expect(result.post).toBeNull();
  });

  it("does not send when the pre-request script fails", async () => {
    const result = await runApiRequest({
      draft: draftOf({ url: `${origin}/users` }),
      scripts: { pre: `nothing.here();`, post: "" },
      values: {}
    });

    expect(result.outcome).toMatchObject({ ok: false });
    expect(result.pre?.error).toContain("nothing");
  });
});

describe("what a script may reach for out of habit", () => {
  it("collects console.log the same way lz.log is collected", () => {
    const result = runPostResponse(
      `console.log("saw", lz.response.status);
       console.warn("careful");`,
      draftOf(),
      responseOf(),
      {}
    );

    expect(result.run.error).toBeNull();
    expect(result.run.logs).toEqual(["saw 200", "careful"]);
  });

  it("still keeps the process out of reach", () => {
    const result = runPostResponse(
      `lz.log(typeof process, typeof require, typeof setTimeout);`,
      draftOf(),
      responseOf(),
      {}
    );

    expect(result.run.logs).toEqual(["undefined undefined undefined"]);
  });
});
