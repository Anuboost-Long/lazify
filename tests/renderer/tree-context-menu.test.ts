// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TreeContextMenu } from "../../src/renderer/shared/ui/project-tree/TreeContextMenu";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

afterEach(() => cleanup());

/**
 * A modal wrapper carries a transform while it animates in, and a transform
 * makes its box the containing block for anything `fixed` inside it. The menu
 * has to leave that subtree or its viewport coordinates land somewhere else.
 */
describe("the tree context menu", () => {
  it("renders outside the panel it was opened from, so fixed means the window", () => {
    const { container } = render(
      createElement(
        "div",
        { style: { transform: "translateY(0)" } },
        createElement(TreeContextMenu, {
          position: { x: 120, y: 240 },
          onRevealInFinder: () => {}
        })
      )
    );

    const item = screen.getByRole("button", { name: "project_tree.reveal_in_finder" });

    expect(container.contains(item)).toBe(false);
    expect(document.body.contains(item)).toBe(true);
  });
});
