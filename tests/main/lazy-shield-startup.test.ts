import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The startup race the browser page used to lose.
 *
 * A restored tab starts loading as soon as the window exists, which is well
 * before the filter engine has been built. What matters is that the session's
 * handlers are already in place by then, and that a request arriving early is
 * held rather than waved through — a page filtered from halfway is what leaves
 * a video player unable to start.
 */

const webRequest = {
  onBeforeRequest: vi.fn(),
  onHeadersReceived: vi.fn()
};

const browserSession = {
  webRequest,
  setPreloads: vi.fn()
};

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp/lazify-test" },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  session: { fromPartition: () => browserSession }
}));

vi.mock("../../src/main/browser/preview-guard", () => ({
  BROWSER_PARTITION: "persist:lazify-web"
}));

vi.mock("../../src/main/diagnostics/logger", () => ({ logError: vi.fn() }));

vi.mock("@ghostery/adblocker", () => ({ Request: { fromRawDetails: vi.fn() } }));

/** Resolved by each test, so the "still building" window can be held open. */
let settleEngine: (engine: unknown) => void;
let failEngine: (error: Error) => void;

const engine = {
  on: vi.fn(),
  onBeforeRequest: vi.fn(),
  onHeadersReceived: vi.fn(),
  serialize: () => new Uint8Array()
};

vi.mock("@ghostery/adblocker-electron", () => ({
  ElectronBlocker: {
    deserialize: () => {
      throw new Error("no cache in tests");
    },
    fromPrebuiltFull: () =>
      new Promise((resolve, reject) => {
        settleEngine = resolve;
        failEngine = reject;
      })
  }
}));

async function loadShield() {
  vi.resetModules();
  webRequest.onBeforeRequest.mockClear();
  webRequest.onHeadersReceived.mockClear();
  engine.onBeforeRequest.mockClear();

  return import("../../src/main/browser/lazy-shield");
}

/** The listener the shield handed to the session. */
function beforeRequestListener() {
  const call = webRequest.onBeforeRequest.mock.calls.at(-1);
  return call?.[1] as (details: unknown, callback: (r: unknown) => void) => void;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the shield during a cold start", () => {
  it("is on the session before the engine finishes building", async () => {
    const shield = await loadShield();

    void shield.initLazyShield(() => {});

    // No awaiting: this is the state the window is created in.
    expect(webRequest.onBeforeRequest).toHaveBeenCalledOnce();
    expect(webRequest.onHeadersReceived).toHaveBeenCalledOnce();
    expect(shield.getLazyShieldState().ready).toBe(false);
  });

  it("holds an early request until the engine can answer for it", async () => {
    const shield = await loadShield();
    void shield.initLazyShield(() => {});

    const callback = vi.fn();
    beforeRequestListener()({ url: "https://youtube.com/" }, callback);

    // Still building: the request must not have been decided yet, in either
    // direction — waving it through is what filtered the page from halfway.
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
    expect(engine.onBeforeRequest).not.toHaveBeenCalled();

    settleEngine(engine);
    await vi.waitFor(() => expect(engine.onBeforeRequest).toHaveBeenCalled());
  });

  it("lets a held request through when the engine cannot be built", async () => {
    const shield = await loadShield();
    void shield.initLazyShield(() => {});

    const callback = vi.fn();
    beforeRequestListener()({ url: "https://youtube.com/" }, callback);

    failEngine(new Error("offline"));

    await vi.waitFor(() => expect(callback).toHaveBeenCalledWith({}));
  });
});
