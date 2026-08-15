// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EnvVariable, ProjectEnvFile } from "../../src/renderer/shared/types/lazify";

/**
 * The panel driven the way the rail drives it: against a bridge that answers
 * like main does — every mutation returning the whole re-parsed file.
 */
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

const PROJECT = "/workspace/demo";

function variable(over: Partial<EnvVariable> = {}): EnvVariable {
  return {
    line: 0,
    key: "DATABASE_URL",
    value: "postgres://localhost/app",
    enabled: true,
    quote: "",
    exported: false,
    comment: null,
    indent: "",
    ...over
  };
}

const bridge = {
  listEnvFiles: vi.fn(),
  readEnvFile: vi.fn(),
  updateEnvVariable: vi.fn(),
  deleteEnvVariable: vi.fn(),
  addEnvVariable: vi.fn(),
  createEnvFile: vi.fn()
};

function file(variables: EnvVariable[]): ProjectEnvFile {
  return { name: ".env", path: `${PROJECT}/.env`, variables };
}

async function mountPane() {
  const { EnvPane } = await import("../../src/renderer/features/env/components/EnvPane");
  return render(createElement(EnvPane, { projectPath: PROJECT }));
}

beforeEach(() => {
  for (const fn of Object.values(bridge)) fn.mockReset();

  bridge.listEnvFiles.mockResolvedValue([
    { name: ".env", path: `${PROJECT}/.env`, variableCount: 2, disabledCount: 1 }
  ]);
  bridge.readEnvFile.mockResolvedValue(
    file([variable(), variable({ line: 1, key: "PORT", value: "3000", enabled: false })])
  );

  Object.defineProperty(globalThis, "lazify", { value: bridge, configurable: true, writable: true });
});

afterEach(cleanup);

describe("EnvPane", () => {
  it("lists every variable in the file, value included", async () => {
    await mountPane();

    expect(await screen.findByText("DATABASE_URL")).toBeTruthy();
    expect(screen.getByText("postgres://localhost/app")).toBeTruthy();
    expect(screen.getByText("PORT")).toBeTruthy();
  });

  it("splits the list into an active group and a commented-out group", async () => {
    await mountPane();

    const active = await screen.findByText("env_pane.group_active");
    const off = screen.getByText("env_pane.group_disabled");

    // Each heading carries its own count, and the active group comes first.
    expect(active.parentElement?.textContent).toContain("1");
    expect(off.parentElement?.textContent).toContain("1");
    expect(active.compareDocumentPosition(off) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // The variables land in the right groups, not merely on the right screen.
    const activeSection = active.closest("section")!;
    const offSection = off.closest("section")!;
    expect(activeSection.textContent).toContain("DATABASE_URL");
    expect(activeSection.textContent).not.toContain("PORT");
    expect(offSection.textContent).toContain("PORT");
  });

  it("leaves out a group that has no variables in it", async () => {
    bridge.readEnvFile.mockResolvedValue(file([variable()]));

    await mountPane();

    expect(await screen.findByText("env_pane.group_active")).toBeTruthy();
    expect(screen.queryByText("env_pane.group_disabled")).toBeNull();
  });

  it("shows a commented-out variable as switched off", async () => {
    await mountPane();

    const enable = await screen.findByLabelText("env_pane.enable PORT");
    expect((enable as HTMLInputElement).checked).toBe(false);

    const disable = screen.getByLabelText("env_pane.disable DATABASE_URL");
    expect((disable as HTMLInputElement).checked).toBe(true);
  });

  it("comments a variable out through the toggle", async () => {
    bridge.updateEnvVariable.mockResolvedValue(
      file([variable({ enabled: false }), variable({ line: 1, key: "PORT", enabled: false })])
    );

    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.disable DATABASE_URL"));

    await waitFor(() =>
      expect(bridge.updateEnvVariable).toHaveBeenCalledWith(PROJECT, ".env", 0, "DATABASE_URL", {
        enabled: false
      })
    );
  });

  it("edits a name and value together", async () => {
    bridge.updateEnvVariable.mockResolvedValue(file([variable({ key: "DB_URL", value: "sqlite://x" })]));

    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.edit_variable DATABASE_URL"));

    const value = screen.getByLabelText("env_pane.value");
    await userEvent.clear(value);
    await userEvent.type(value, "sqlite://x");
    await userEvent.click(screen.getByLabelText("global_term.save"));

    await waitFor(() =>
      expect(bridge.updateEnvVariable).toHaveBeenCalledWith(PROJECT, ".env", 0, "DATABASE_URL", {
        key: "DATABASE_URL",
        value: "sqlite://x"
      })
    );
  });

  it("strips newlines out of a pasted value, which the file cannot hold", async () => {
    bridge.updateEnvVariable.mockResolvedValue(file([variable({ value: "onetwo" })]));

    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.edit_variable DATABASE_URL"));

    const value = screen.getByLabelText("env_pane.value");
    await userEvent.clear(value);
    await userEvent.paste("one\ntwo");
    await userEvent.click(screen.getByLabelText("global_term.save"));

    await waitFor(() =>
      expect(bridge.updateEnvVariable).toHaveBeenCalledWith(PROJECT, ".env", 0, "DATABASE_URL", {
        key: "DATABASE_URL",
        value: "onetwo"
      })
    );
  });

  it("adds a variable, upper-casing the name as it is typed", async () => {
    bridge.addEnvVariable.mockResolvedValue(file([variable(), variable({ line: 1, key: "API_KEY", value: "abc" })]));

    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.add_variable"));

    await userEvent.type(screen.getByLabelText("env_pane.name"), "api_key");
    await userEvent.type(screen.getByLabelText("env_pane.value"), "abc");
    await userEvent.click(screen.getByLabelText("global_term.add"));

    await waitFor(() =>
      expect(bridge.addEnvVariable).toHaveBeenCalledWith(PROJECT, ".env", "API_KEY", "abc")
    );
  });

  it("refuses a name the file already has, without calling main", async () => {
    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.add_variable"));
    await userEvent.type(screen.getByLabelText("env_pane.name"), "PORT");

    expect(screen.getByText(/env_pane.duplicate_name/)).toBeTruthy();
    expect((screen.getByLabelText("global_term.add") as HTMLButtonElement).disabled).toBe(true);
    expect(bridge.addEnvVariable).not.toHaveBeenCalled();
  });

  it("asks twice before deleting", async () => {
    bridge.deleteEnvVariable.mockResolvedValue(file([variable({ line: 0, key: "PORT", enabled: false })]));

    await mountPane();
    await userEvent.click(await screen.findByLabelText("global_term.delete DATABASE_URL"));
    expect(bridge.deleteEnvVariable).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText("env_pane.confirm_delete"));

    await waitFor(() =>
      expect(bridge.deleteEnvVariable).toHaveBeenCalledWith(PROJECT, ".env", 0, "DATABASE_URL")
    );
  });

  it("masks values on request and leaves the names readable", async () => {
    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.hide_values"));

    expect(screen.queryByText("postgres://localhost/app")).toBeNull();
    expect(screen.getByText("DATABASE_URL")).toBeTruthy();
  });

  it("surfaces a rejected edit instead of dropping it", async () => {
    bridge.updateEnvVariable.mockRejectedValue(new Error("PORT is no longer on line 2"));

    await mountPane();
    await userEvent.click(await screen.findByLabelText("env_pane.enable PORT"));

    expect(await screen.findByText("PORT is no longer on line 2")).toBeTruthy();
  });

  it("offers to create .env when the project has none", async () => {
    bridge.listEnvFiles.mockResolvedValue([]);
    bridge.createEnvFile.mockResolvedValue(file([]));

    await mountPane();
    await userEvent.click(await screen.findByText("env_pane.create_file"));

    await waitFor(() => expect(bridge.createEnvFile).toHaveBeenCalledWith(PROJECT, ".env"));
  });
});
