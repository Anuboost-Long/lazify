// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

import {
  chooseDocLogo,
  collectionDocBrief,
  collectionDocQuestions,
  docState,
  draftChanged,
  importCollectionDocDraft,
  previewCollectionDoc,
  ptyData,
  ptyWrite,
  openAgentTerminal,
  readApiCollections,
  readCollectionDoc,
  readProjectRoutes,
  renderPage,
  route,
  saveCollectionDoc,
  scanResult,
  watchCollectionDocDraft,
  writeCollectionDocBrief
} from "./harness";
import { openCustom, pickMenuItem, rowMenu } from "./collection-harness";
import { registerTerminalPaste } from "../../../src/renderer/shared/lib/terminal-paste";

function heldCollection() {
  return [
    {
      id: "collection-1",
      name: "Kept",
      folders: [],
      requests: [
        { id: "request-1", name: "Fetch a user", routeId: "route_1", route: route(), draft: null, examples: [] }
      ]
    }
  ];
}

async function openDocument() {
  readApiCollections.mockResolvedValue(heldCollection());
  readProjectRoutes.mockResolvedValue(scanResult());
  renderPage();
  await openCustom();
  await rowMenu("Kept");
  await pickMenuItem(/api_studio\.doc_builder/i);
}

describe("the document builder for a collection", () => {
  it("opens on the collection, with the sections it asks for", async () => {
    await openDocument();

    expect(await screen.findByText("Overview")).toBeTruthy();
    expect(screen.getByText("Authentication")).toBeTruthy();
    expect(screen.getByText(/What is this API for/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /api_studio\.doc_preview/i })).toBeTruthy();
  });

  it("keeps what the user types as markdown", async () => {
    await openDocument();

    const field = (await screen.findAllByRole("textbox"))
      .map((element) => element as HTMLElement)
      .find((element) => element.getAttribute("contenteditable") === "true");

    expect(field).toBeTruthy();

    field!.innerHTML = "<p>Everything a partner can call.</p><ul><li>Payments</li></ul>";
    fireEvent.input(field!);

    await waitFor(
      () => {
        const written = saveCollectionDoc.mock.calls.at(-1)?.[1] as { sections: Record<string, string> };

        expect(written.sections.overview).toBe("Everything a partner can call.\n\n- Payments");
      },
      { timeout: 2000 }
    );
  });

  it("hands the same rules to an agent, and takes the draft back", async () => {
    await openDocument();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.doc_agent/i }));

    await waitFor(() => expect(collectionDocBrief).toHaveBeenCalled());
    expect(await screen.findByText(/Read doc-job.json/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.doc_write_brief/i }));
    await waitFor(() => expect(writeCollectionDocBrief).toHaveBeenCalled());
    expect(await screen.findByText(/doc_brief_written/)).toBeTruthy();

    importCollectionDocDraft.mockResolvedValue({
      doc: { collectionId: "collection-1" },
      filled: 3,
      filledKeys: [],
      ignored: []
    });

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.doc_import_draft/i }));
    await waitFor(() => expect(importCollectionDocDraft).toHaveBeenCalledWith("/workspace/demo", "collection-1", false));
  });

  it("names the document and carries a logo into it", async () => {
    await openDocument();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.doc_design/i }));

    // The sheet beside the controls shows what the choices produce.
    expect(await screen.findByText(/A4 · Kept/)).toBeTruthy();

    await userEvent.click(await screen.findByRole("button", { name: /api_studio\.doc_add_logo/i }));

    await waitFor(() => expect(chooseDocLogo).toHaveBeenCalled());
    await waitFor(() => {
      const written = saveCollectionDoc.mock.calls.at(-1)?.[1] as { theme: { logo: string } };

      expect(written.theme.logo).toBe("data:image/png;base64,iVBORw0KGgo=");
    });

    const name = screen.getByDisplayValue("Kept");

    await userEvent.type(name, " API");

    await waitFor(() => {
      const written = saveCollectionDoc.mock.calls.at(-1)?.[1] as { title: string };

      expect(written.title).toBe("Kept API");
    });

    await userEvent.click(screen.getByRole("button", { name: "#b45309" }));

    await waitFor(() => {
      const written = saveCollectionDoc.mock.calls.at(-1)?.[1] as { theme: { accent: string } };

      expect(written.theme.accent).toBe("#b45309");
    });
  });

  it("writes a folder's own description from the outline", async () => {
    const state = docState();

    state.doc.folders = [{ id: "folder-1", name: "Authentication", description: "" }];
    state.doc.routes[0].folderId = "folder-1";
    state.doc.routes[0].folder = "Authentication";
    state.gaps = [
      {
        requestId: null,
        folderId: "folder-1",
        sectionId: "folder_description",
        where: "Authentication",
        question: "What do the routes in Authentication have in common?"
      }
    ];

    readApiCollections.mockResolvedValue([
      {
        id: "collection-1",
        name: "Kept",
        folders: [
          {
            id: "folder-1",
            name: "Authentication",
            requests: [
              {
                id: "request-1",
                name: "Fetch a user",
                routeId: "route_1",
                route: route(),
                draft: null,
                examples: []
              }
            ]
          }
        ],
        requests: []
      }
    ]);
    readCollectionDoc.mockResolvedValue(state);
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();
    await openCustom();
    await rowMenu("Kept");
    await pickMenuItem(/api_studio\.doc_builder/i);

    await userEvent.click(await screen.findByRole("button", { name: /Authentication/ }));

    expect(await screen.findByText("About this group")).toBeTruthy();
    expect(screen.getByText(/What do the routes in Authentication/)).toBeTruthy();

    const field = (await screen.findAllByRole("textbox"))
      .map((element) => element as HTMLElement)
      .find((element) => element.getAttribute("contenteditable") === "true");

    field!.innerHTML = "<p>Tokens for the partner gateway.</p>";
    fireEvent.input(field!);

    await waitFor(
      () => {
        const written = saveCollectionDoc.mock.calls.at(-1)?.[1] as {
          folders: Array<{ description: string }>;
        };

        expect(written.folders[0].description).toBe("Tokens for the partner gateway.");
      },
      { timeout: 2000 }
    );
  });

  it("runs its own agent inside the document and types the question in", async () => {
    const pasted: string[] = [];
    const stop = registerTerminalPaste("run-1", (text) => pasted.push(text));

    await openDocument();

    // Every blank field offers it now, so this is the Overview one.
    const askButtons = await screen.findAllByRole("button", {
      name: /api_studio\.doc_ask_agent$/i
    });

    await userEvent.click(askButtons[0]);

    await waitFor(() =>
      expect(collectionDocQuestions).toHaveBeenCalledWith("/workspace/demo", "collection-1", [
        "||overview"
      ])
    );

    // Its own session, hidden from every other session list in the app.
    await userEvent.click(await screen.findByRole("button", { name: /Claude/ }));

    await waitFor(() =>
      expect(openAgentTerminal).toHaveBeenCalledWith(
        "claude",
        "/workspace/demo",
        100,
        28,
        undefined,
        true
      )
    );

    // Nothing is typed until the agent has printed something: a CLI still
    // starting up would swallow the prompt.
    expect(pasted).toEqual([]);

    ptyData("run-1");

    await waitFor(() => expect(pasted).toEqual(["Answer these questions"]), { timeout: 3000 });
    await waitFor(() => expect(ptyWrite).toHaveBeenCalledWith("run-1", "\r"));

    expect(await screen.findByText(/api_studio\.doc_agent_working/i)).toBeTruthy();
    await waitFor(() =>
      expect(watchCollectionDocDraft).toHaveBeenCalledWith("/workspace/demo", "collection-1")
    );

    const answered = docState();

    answered.doc.sections.overview = "Everything a partner can call.";
    answered.gaps = [];
    importCollectionDocDraft.mockResolvedValue({
      doc: answered.doc,
      filled: 1,
      filledKeys: ["||overview"],
      ignored: []
    });
    readCollectionDoc.mockResolvedValue(answered);

    draftChanged("collection-1");

    await waitFor(() =>
      expect(importCollectionDocDraft).toHaveBeenCalledWith(
        "/workspace/demo",
        "collection-1",
        false,
        true
      )
    );
    expect(await screen.findByText("Everything a partner can call.")).toBeTruthy();

    // The field says where the answer landed, not just the terminal.
    expect(await screen.findByText(/api_studio\.doc_answer_landed/i)).toBeTruthy();

    stop();
  });

  it("types a second question into the session already running", async () => {
    const pasted: string[] = [];
    const stop = registerTerminalPaste("run-1", (text) => pasted.push(text));

    await openDocument();

    const askButtons = await screen.findAllByRole("button", {
      name: /api_studio\.doc_ask_agent$/i
    });

    await userEvent.click(askButtons[0]);
    await userEvent.click(await screen.findByRole("button", { name: /Claude/ }));
    await waitFor(() => expect(openAgentTerminal).toHaveBeenCalled());

    ptyData("run-1");
    await waitFor(() => expect(pasted).toHaveLength(1), { timeout: 3000 });

    collectionDocQuestions.mockResolvedValue("And this optional one too");

    // An optional field with no standing question, asked while the agent runs.
    const later = await screen.findAllByRole("button", {
      name: /api_studio\.doc_ask_agent$/i
    });

    await userEvent.click(later[later.length - 1]);

    await waitFor(() => expect(pasted).toEqual(["Answer these questions", "And this optional one too"]));
    await waitFor(() => expect(ptyWrite).toHaveBeenCalledTimes(2));

    stop();
  });

  it("keeps its session out of every other session list", async () => {
    await openDocument();

    // Every blank field offers it now, so this is the Overview one.
    const askButtons = await screen.findAllByRole("button", {
      name: /api_studio\.doc_ask_agent$/i
    });

    await userEvent.click(askButtons[0]);
    await userEvent.click(await screen.findByRole("button", { name: /Claude/ }));

    await waitFor(() => expect(openAgentTerminal).toHaveBeenCalled());

    expect(openAgentTerminal.mock.calls[0][5]).toBe(true);
  });

  it("asks about every open question at once", async () => {
    await openDocument();

    await userEvent.click(
      await screen.findByRole("button", { name: /api_studio\.doc_ask_agent_all/i })
    );

    await waitFor(() =>
      expect(collectionDocQuestions).toHaveBeenCalledWith("/workspace/demo", "collection-1", [
        "||overview"
      ])
    );
  });

  it("builds a preview before anything is exported", async () => {
    await openDocument();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.doc_preview/i }));

    await waitFor(() => expect(previewCollectionDoc).toHaveBeenCalledWith("/workspace/demo", "collection-1"));

    const frame = (await screen.findByTitle("Kept")) as HTMLIFrameElement;

    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
  });

  it("copies for the preview, which cannot reach the clipboard itself", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    await openDocument();
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.doc_preview/i }));

    const frame = (await screen.findByTitle("Kept")) as HTMLIFrameElement;

    globalThis.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "lazify-doc-copy", text: "curl -X GET 'https://api.example.com'" },
        source: frame.contentWindow
      })
    );

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("curl -X GET 'https://api.example.com'")
    );

    globalThis.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "lazify-doc-copy", text: "from somewhere else" },
        source: window
      })
    );

    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
