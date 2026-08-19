// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFileQuickOpen } from "../../src/renderer/shared/ui/command-palette/useFileQuickOpen";
import { useTemplateTree } from "../../src/renderer/features/templates/components/useTemplateTree";
import type { ProjectTreeNode } from "../../src/renderer/shared/types/lazify";

const tree: ProjectTreeNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    source: "custom",
    locked: false,
    children: [
      {
        id: "app",
        name: "App.tsx",
        type: "file",
        source: "custom",
        locked: false,
        content: "export default App;",
        children: []
      },
      {
        id: "styles",
        name: "styles.css",
        type: "file",
        source: "custom",
        locked: false,
        content: ".app {}",
        children: []
      }
    ]
  }
];

afterEach(() => cleanup());

describe("template tree editor", () => {
  it("opens, switches, reorders, and closes files through shared editor tabs", () => {
    const onTreeChange = vi.fn();
    const { result } = renderHook(() =>
      useTemplateTree({
        initialTree: tree,
        onTreeChange,
        replaceTreeOnInitialChange: true
      })
    );

    expect(result.current.openFiles.map((tab) => tab.name)).toEqual(["App.tsx"]);

    act(() => result.current.handleSelectNode("styles"));
    expect(result.current.openFiles.map((tab) => tab.name)).toEqual([
      "App.tsx",
      "styles.css"
    ]);
    expect(result.current.activeFileNode?.id).toBe("styles");

    act(() =>
      result.current.handleReorderOpenFiles("src/styles.css", "src/App.tsx")
    );
    expect(result.current.openFiles.map((tab) => tab.name)).toEqual([
      "styles.css",
      "App.tsx"
    ]);

    act(() => result.current.handleCloseOpenFile("src/styles.css"));
    expect(result.current.activeFileNode?.id).toBe("app");

    act(() => result.current.handleCloseAllOpenFiles());
    expect(result.current.openFiles).toEqual([]);
    expect(result.current.activeFileNode).toBeNull();
  });

  it("indexes snapshot trees for the same Cmd/Ctrl+P quick-open search", () => {
    const onOpenFile = vi.fn();
    const { result } = renderHook(() => useFileQuickOpen(tree, onOpenFile));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "p", metaKey: true, bubbles: true })
      );
    });
    act(() => result.current.setQuery("styles"));

    expect(result.current.results[0]?.entry).toEqual(
      expect.objectContaining({ id: "styles", path: "src/styles.css" })
    );

    act(() => result.current.select(result.current.results[0].entry));
    expect(onOpenFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "styles" })
    );
    expect(result.current.open).toBe(false);
  });
});
