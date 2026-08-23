// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectTreeList } from "../../src/renderer/shared/ui/project-tree/core/ProjectTreeList";

const tree = [
  {
    id: "src",
    name: "src",
    type: "folder" as const,
    children: [
      {
        id: "app",
        name: "app.ts",
        type: "file" as const,
        children: [],
      },
    ],
  },
];

afterEach(() => cleanup());

describe("ProjectTreeList", () => {
  it("keeps selection and expansion controlled by its caller", () => {
    const onSelect = vi.fn();
    const onToggleExpand = vi.fn();
    const { rerender } = render(
      createElement(ProjectTreeList, {
        nodes: tree,
        expandedIds: [],
        onSelect,
        onToggleExpand,
      })
    );

    expect(screen.queryByText("app.ts")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /src/ }));
    expect(onSelect).toHaveBeenCalledWith(tree[0]);
    expect(onToggleExpand).toHaveBeenCalledWith(tree[0]);

    rerender(
      createElement(ProjectTreeList, {
        nodes: tree,
        expandedIds: ["src"],
        selectedId: "app",
        onSelect,
        onToggleExpand,
      })
    );

    expect(screen.getByText("app.ts")).toBeTruthy();
  });

  it("exposes file nodes to selection and context-menu callbacks", () => {
    const onSelect = vi.fn();
    const onOpenContextMenu = vi.fn();

    render(
      createElement(ProjectTreeList, {
        nodes: tree,
        expandedIds: ["src"],
        density: "compact",
        onSelect,
        onToggleExpand: vi.fn(),
        onOpenContextMenu,
      })
    );

    const file = screen.getByRole("button", { name: /app.ts/ });
    fireEvent.click(file);
    fireEvent.contextMenu(file);

    expect(onSelect).toHaveBeenCalledWith(tree[0].children[0]);
    expect(onOpenContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ type: "contextmenu" }),
      tree[0].children[0]
    );
  });
});
