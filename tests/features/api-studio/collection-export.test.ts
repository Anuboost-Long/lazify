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

import { PROJECT, exportCustomCollection, exportPostmanCollection } from "./harness";
import { pickFirstRoute, pickMenuItem, rowMenu, withCollection } from "./collection-harness";

describe("taking a collection out of the app", () => {
  it("exports the collection the pointer is on, not the project's", async () => {
    await withCollection();

    await rowMenu("api_studio.new_collection_name");
    await pickMenuItem(/api_studio\.pick_requests/i);
    await pickFirstRoute();

    const collection = screen.getByText("api_studio.new_collection_name");

    fireEvent.contextMenu(collection);

    await userEvent.click(
      await screen.findByRole("menuitem", { name: /api_studio\.export_collection/i })
    );

    await waitFor(() =>
      expect(exportCustomCollection).toHaveBeenCalledWith(
        PROJECT,
        expect.stringContaining("collection-"),
        "api_studio.new_collection_name"
      )
    );
    expect(exportPostmanCollection).not.toHaveBeenCalled();
  });

  it("keeps the project's export button out of the custom collection", async () => {
    await withCollection();

    expect(screen.queryByRole("button", { name: /api_studio\.export_collection/i })).toBeNull();
  });
});
