import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sendApiRequest } from "../../../src/main/api-studio";

let server: http.Server;
let origin: string;

beforeAll(async () => {
  server = http.createServer((request, response) => {
    if (request.url === "/large") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("x".repeat(3_000_000));
      return;
    }

    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      response.writeHead(request.url === "/missing" ? 404 : 200, {
        "content-type": "application/json",
        "x-echo-auth": request.headers.authorization ?? "",
        "x-echo-content-type": request.headers["content-type"] ?? ""
      });
      response.end(
        JSON.stringify({ method: request.method, url: request.url, body: Buffer.concat(chunks).toString() })
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("sending a request from the main process", () => {
  it("returns the status, headers, body and timing of a local call", async () => {
    const outcome = await sendApiRequest({
      method: "GET",
      url: `${origin}/users/42`,
      headers: [{ name: "Authorization", value: "Bearer abc" }],
      body: null
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.response.status).toBe(200);
    expect(JSON.parse(outcome.response.body)).toMatchObject({
      method: "GET",
      url: "/users/42",
      body: ""
    });
    expect(outcome.response.headers).toContainEqual({ name: "x-echo-auth", value: "Bearer abc" });
    expect(outcome.response.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("carries a body on the methods that take one", async () => {
    const outcome = await sendApiRequest({
      method: "POST",
      url: `${origin}/users`,
      headers: [{ name: "Content-Type", value: "application/json" }],
      body: '{"name":"Ada"}'
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(JSON.parse(outcome.response.body).body).toBe('{"name":"Ada"}');
  });

  it("reports a failing status as a response rather than an error", async () => {
    const outcome = await sendApiRequest({
      method: "GET",
      url: `${origin}/missing`,
      headers: [],
      body: null
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.response.status).toBe(404);
  });

  it("caps a response that would not fit in memory comfortably", async () => {
    const outcome = await sendApiRequest({
      method: "GET",
      url: `${origin}/large`,
      headers: [],
      body: null
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.response.truncated).toBe(true);
    expect(outcome.response.body.length).toBeLessThanOrEqual(2_000_000);
  });

  it("uploads a file the request names, reading it where files can be read", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-upload-"));
    const filePath = path.join(directory, "avatar.png");

    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const outcome = await sendApiRequest({
      method: "POST",
      url: `${origin}/upload`,
      headers: [{ name: "Content-Type", value: "multipart/form-data" }],
      body: null,
      multipart: [
        { name: "note", text: "a picture" },
        { name: "file", filePath }
      ]
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const sent = JSON.parse(outcome.response.body).body;
    const boundary = outcome.response.headers
      .find((header) => header.name === "x-echo-content-type")!
      .value.split("boundary=")[1];

    expect(boundary).toBeTruthy();
    expect(sent).toContain(`--${boundary}`);
    expect(sent).toContain('Content-Disposition: form-data; name="note"');
    expect(sent).toContain("a picture");
    expect(sent).toContain(
      'Content-Disposition: form-data; name="file"; filename="avatar.png"'
    );
    expect(sent).toContain("Content-Type: application/octet-stream");
    expect(sent).toContain("PNG");
    expect(sent.trimEnd().endsWith(`--${boundary}--`)).toBe(true);

    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("says which file it could not find rather than sending half a body", async () => {
    const outcome = await sendApiRequest({
      method: "POST",
      url: `${origin}/upload`,
      headers: [],
      body: null,
      multipart: [{ name: "file", filePath: "/no/such/avatar.png" }]
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    expect(outcome.error).toContain("/no/such/avatar.png");
  });

  it("explains why a request never reached a server", async () => {
    const closed = http.createServer();

    await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const port = (closed.address() as AddressInfo).port;
    await new Promise((resolve) => closed.close(resolve));

    const outcome = await sendApiRequest({
      method: "GET",
      url: `http://127.0.0.1:${port}/users`,
      headers: [],
      body: null
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;

    expect(outcome.error).toMatch(/ECONNREFUSED/);
  });
});
