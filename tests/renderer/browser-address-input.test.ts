import { describe, expect, it } from "vitest";

import { resolveBrowserInput } from "../../src/renderer/features/browser/lib/browser-url";

describe("what the address bar does with a host", () => {
  it("completes a bare domain to https", () => {
    expect(resolveBrowserInput("example.com")).toBe("https://example.com");
    expect(resolveBrowserInput("news.ycombinator.com")).toBe("https://news.ycombinator.com");
  });

  it("keeps the path, query and fragment that came with it", () => {
    expect(resolveBrowserInput("github.com/lazify/pulls")).toBe(
      "https://github.com/lazify/pulls"
    );
    expect(resolveBrowserInput("example.com?q=1")).toBe("https://example.com?q=1");
    expect(resolveBrowserInput("example.com#top")).toBe("https://example.com#top");
  });

  it("loads a dev server rather than searching for it", () => {
    // `localhost:3000` reads as a scheme, which is how it used to end up as a
    // search for the words "localhost 3000".
    expect(resolveBrowserInput("localhost:3000")).toBe("http://localhost:3000");
    expect(resolveBrowserInput("127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(resolveBrowserInput("192.168.1.4")).toBe("http://192.168.1.4");
  });

  it("completes a host on a port to https when it is out on the web", () => {
    expect(resolveBrowserInput("example.com:8443")).toBe("https://example.com:8443");
  });

  it("leaves an address that already has a scheme alone", () => {
    expect(resolveBrowserInput("http://example.com")).toBe("http://example.com/");
  });
});

describe("what it sends to the search engine instead", () => {
  it("searches for words", () => {
    expect(resolveBrowserInput("how to center a div")).toContain("duckduckgo.com");
  });

  it("searches for a number that only looks like a host", () => {
    expect(resolveBrowserInput("3.14")).toContain("duckduckgo.com");
    expect(resolveBrowserInput("v1.2")).toContain("duckduckgo.com");
  });

  it("searches for a single word with no dot and no port", () => {
    expect(resolveBrowserInput("lazify")).toContain("duckduckgo.com");
  });

  it("searches for an email address", () => {
    expect(resolveBrowserInput("someone@example.com")).toContain("duckduckgo.com");
  });

  it("refuses a scheme it will not load", () => {
    expect(resolveBrowserInput("file:///etc/passwd")).toContain("duckduckgo.com");
  });
});
