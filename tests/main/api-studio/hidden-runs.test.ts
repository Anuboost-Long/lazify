import { describe, expect, it } from "vitest";

import { forgetHiddenRun, hideRun, isHiddenRun } from "../../../src/main/agents/hidden-runs";

describe("a run one screen owns", () => {
  it("is hidden from the lists everything else builds from", () => {
    expect(isHiddenRun("run-1")).toBe(false);

    hideRun("run-1");

    expect(isHiddenRun("run-1")).toBe(true);
    expect(isHiddenRun("run-2")).toBe(false);

    forgetHiddenRun("run-1");

    expect(isHiddenRun("run-1")).toBe(false);
  });
});
