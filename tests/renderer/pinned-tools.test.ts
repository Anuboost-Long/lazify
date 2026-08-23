// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { SidebarPinnedTools } from "../../src/renderer/app/components/SidebarPinnedTools";
import { apiStudioTool, availableTools } from "../../src/renderer/features/tools/catalog";
import { usePinnedTools } from "../../src/renderer/features/tools/hooks/use-pinned-tools";
import { ToolsPage } from "../../src/renderer/features/tools/pages/ToolsPage";
import UiIcon from "../../src/renderer/shared/ui/icons/UiIcon";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

function PinnedDrawer({ onNavigate }: Readonly<{ onNavigate: (path: string) => void }>) {
  const { pinnedToolIds } = usePinnedTools();
  const tools = availableTools("").filter((tool) => pinnedToolIds.includes(tool.id));

  return createElement(SidebarPinnedTools, {
    tools,
    activePath: "/",
    collapsed: false,
    onNavigate
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe("pinned tools", () => {
  it("pins a tool from the grid, persists it, and adds its drawer shortcut", async () => {
    const onNavigate = vi.fn();
    render(
      createElement(
        MemoryRouter,
        null,
        createElement(ToolsPage),
        createElement(PinnedDrawer, { onNavigate })
      )
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: "tools.pin_to_drawer" })[0]
    );

    expect(JSON.parse(localStorage.getItem("lazify-pinned-tools") ?? "[]")).toEqual([
      "prompt-builder"
    ]);

    const pinned = screen.getByRole("region", { name: "tools.pinned_tools" });
    await userEvent.click(within(pinned).getByRole("button", { name: "tools.prompt_builder" }));
    expect(onNavigate).toHaveBeenCalledWith("/tools/prompt-builder");
  });

  it("uses a route-focused icon for API Studio", () => {
    expect(apiStudioTool.icon).toBe("network");
  });

  it.each(["sparks", "network"] as const)(
    "provides a filled state for the %s tool icon",
    (name) => {
      const outline = renderToStaticMarkup(createElement(UiIcon, { name }));
      const filled = renderToStaticMarkup(createElement(UiIcon, { name, filled: true }));

      expect(filled).not.toBe(outline);
      expect(filled).toContain('fill="currentColor"');
    }
  );
});
