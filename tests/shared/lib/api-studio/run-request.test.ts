import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";
import { nodeHttp } from "../../../platform/node-http";

appFolders.data = "/nonexistent-run-request-data";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders, http: nodeHttp } }));

/**
 * `runApiRequest`'s own job is the orchestration around the scripts (stop
 * handling, merging changed values, calling `sendApiRequest`) — the sandbox
 * itself is already characterised directly in `scripting-sandbox.test.ts`.
 * `Worker` doesn't exist under Node (Vitest's environment here), so this
 * delegates to the same synchronous sandbox the worker would run, wrapped
 * to look async; the real worker round-trip is verified live in the app.
 */
vi.mock("@/shared/lib/api-studio/scripting/run-scripted", async () => {
  const pre = await import("@/shared/lib/api-studio/scripting/pre-request");
  const post = await import("@/shared/lib/api-studio/scripting/post-response");

  return {
    runPreRequest: async (...args: Parameters<typeof pre.runPreRequest>) => pre.runPreRequest(...args),
    runPostResponse: async (...args: Parameters<typeof post.runPostResponse>) => post.runPostResponse(...args),
  };
});

const { runApiRequest } = await import("@/shared/lib/api-studio/runner/run-request");

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

function draftOf(over: Record<string, unknown> = {}) {
  return {
    method: "POST" as const,
    url: "http://example.test/users",
    headers: [{ name: "Content-Type", value: "application/json" }],
    body: '{"name":"Ada"}',
    ...over
  };
}

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
