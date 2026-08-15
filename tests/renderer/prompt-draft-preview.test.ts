// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PromptPreset } from "../../src/main/prompts/types";
import { usePromptDraft } from "../../src/renderer/features/prompts/hooks/use-prompt-draft";

/** Stands in for the list the caller already has loaded. */
const PRESETS: PromptPreset[] = [
  {
    id: "builtin-general",
    name: "General Development",
    description: "",
    template: "Task:\n{{task_name}}\n\nDescription:\n{{task_description}}\n",
    isBuiltin: true,
    sortOrder: 0
  }
];

let listContextEntries: ReturnType<typeof vi.fn>;
let buildPrompt: ReturnType<typeof vi.fn>;
let suggestPromptPreset: ReturnType<typeof vi.fn>;

beforeEach(() => {
  listContextEntries = vi.fn().mockResolvedValue([]);
  buildPrompt = vi.fn();
  suggestPromptPreset = vi.fn();

  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { listContextEntries, buildPrompt, suggestPromptPreset }
  });
});

afterEach(() => cleanup());

async function mountDraft() {
  const view = renderHook(() => usePromptDraft("/work/demo", "Demo", PRESETS));

  // The one read the preview needs: this project's context, once.
  await waitFor(() => expect(listContextEntries).toHaveBeenCalledTimes(1));

  return view;
}

describe("previewing a prompt while the user types", () => {
  it("shows the new text on the keystroke, with nothing to wait for", async () => {
    const { result } = await mountDraft();

    act(() => result.current.patch({ description: "Add dark mode." }));

    // No timers advanced, no promises awaited: the text is already there.
    expect(result.current.prompt).toContain("Add dark mode.");
  });

  it("never goes to the main process for the text", async () => {
    const { result } = await mountDraft();

    for (const description of ["A", "Ad", "Add", "Add d", "Add dark mode."]) {
      act(() => result.current.patch({ description }));
    }

    act(() => result.current.patch({ taskName: "Dark mode" }));

    expect(buildPrompt).not.toHaveBeenCalled();
    expect(suggestPromptPreset).not.toHaveBeenCalled();
    // Still one read, from mounting — typing added none.
    expect(listContextEntries).toHaveBeenCalledTimes(1);
    expect(result.current.prompt).toContain("Dark mode");
  });

  it("suggests a preset from the words typed, without asking anyone", async () => {
    const { result } = await mountDraft();

    act(() => result.current.patch({ description: "Fix the broken login redirect" }));

    expect(result.current.suggestedPresetId).toBe("builtin-bug-fix");
    expect(suggestPromptPreset).not.toHaveBeenCalled();
  });

  it("leaves an edited prompt alone until it is asked to build again", async () => {
    const { result } = await mountDraft();

    act(() => result.current.patch({ description: "Add dark mode." }));
    act(() => result.current.setEdited("hand written"));
    act(() => result.current.patch({ description: "Add light mode." }));

    expect(result.current.prompt).toBe("hand written");
    expect(result.current.isEdited).toBe(true);

    act(() => result.current.regenerate());

    expect(result.current.prompt).toContain("Add light mode.");
    expect(result.current.isEdited).toBe(false);
  });
});
