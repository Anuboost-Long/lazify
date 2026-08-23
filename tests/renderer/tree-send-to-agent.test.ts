// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SendToAgentDialog } from "../../src/renderer/features/agents/components/send-to-agent/SendToAgentDialog";
import { TreeContextMenu } from "../../src/renderer/shared/ui/project-tree/TreeContextMenu";
import { useInterfaceSettings } from "../../src/renderer/shared/hooks/use-interface-settings";

const pasteIntoTerminal = vi.hoisted(() => vi.fn());

vi.mock("@renderer/shared/lib/terminal-paste", () => ({ pasteIntoTerminal }));

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

beforeEach(() => {
  pasteIntoTerminal.mockReset();
  localStorage.clear();
  globalThis.lazify = {
    listSessions: vi.fn().mockResolvedValue([
      {
        runId: "run-1",
        scriptName: "Codex",
        projectPath: "/repo",
        projectName: "Demo",
        pid: 1,
        startedAt: "2026-08-18T00:00:00.000Z",
        ports: [],
        waiting: false,
        isAgent: true,
      },
    ]),
  } as unknown as typeof globalThis.lazify;
});

afterEach(() => cleanup());

describe("tree send to agent", () => {
  it("offers the context-menu action when the tree provides it", () => {
    const onSendToAgent = vi.fn();

    render(
      createElement(TreeContextMenu, {
        position: { x: 20, y: 20 },
        onSendToAgent,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "agents.send_to_agent" }));

    expect(onSendToAgent).toHaveBeenCalledOnce();
  });

  it("pastes only the file path into the selected agent", async () => {
    const onSent = vi.fn();
    const onClose = vi.fn();

    render(
      createElement(SendToAgentDialog, {
        selection: null,
        filePath: "src/app.ts",
        projectPath: "/repo",
        agents: [],
        onStartAgent: vi.fn(),
        onCreateAgent: vi.fn(),
        onDeleteAgent: vi.fn(),
        onSent,
        onClose,
      })
    );

    await userEvent.click(await screen.findByRole("button", { name: /Codex Demo/ }));

    expect(pasteIntoTerminal).toHaveBeenCalledWith("run-1", "src/app.ts");
    expect(onSent).toHaveBeenCalledWith("run-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("persists whether sending opens the selected agent", () => {
    const { result } = renderHook(() => useInterfaceSettings());

    expect(result.current.openAgentAfterSend).toBe(true);

    act(() => result.current.setOpenAgentAfterSend(false));

    expect(result.current.openAgentAfterSend).toBe(false);
    expect(localStorage.getItem("lazify-open-agent-after-send")).toBe("false");
  });
});
