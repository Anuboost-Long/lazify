import { afterEach, describe, expect, it } from "vitest";

import {
  dismissFailure,
  failureNotice,
  reportFailure,
  subscribeFailure
} from "../../src/renderer/shared/ui/toast/failure-toast";

afterEach(() => dismissFailure());

describe("the toast a failed write raises", () => {
  it("keeps the same notice when the same failure repeats", () => {
    reportFailure("a.title", "a.message");
    const first = failureNotice();

    reportFailure("a.title", "a.message");

    expect(failureNotice()?.id).toBe(first?.id);
  });

  it("replaces the notice when a different failure arrives", () => {
    reportFailure("a.title", "a.message");
    const first = failureNotice();

    reportFailure("b.title", "b.message");

    expect(failureNotice()?.id).not.toBe(first?.id);
    expect(failureNotice()?.titleKey).toBe("b.title");
  });

  it("clears on dismiss, and shows the same failure again if it returns", () => {
    reportFailure("a.title", "a.message");
    dismissFailure();

    expect(failureNotice()).toBeNull();

    reportFailure("a.title", "a.message");

    expect(failureNotice()?.titleKey).toBe("a.title");
  });

  it("tells a subscriber only when the notice actually changes", () => {
    const seen: (string | null)[] = [];
    const stop = subscribeFailure(() => seen.push(failureNotice()?.titleKey ?? null));

    reportFailure("a.title", "a.message");
    reportFailure("a.title", "a.message");
    reportFailure("b.title", "b.message");
    dismissFailure();
    dismissFailure();
    stop();

    expect(seen).toEqual(["a.title", "b.title", null]);
  });
});
