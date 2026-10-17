import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { postRoute, readProjectRoutes, renderPage, route, saveApiCollections, scanResult } from "./harness";

export function rowOptions(name: RegExp | string) {
  const source = typeof name === "string" ? name : name.source;

  return new RegExp(`api_studio\\.row_options ${source}`, "i");
}

export async function rowMenu(name: RegExp | string) {
  await userEvent.click(await screen.findByRole("button", { name: rowOptions(name) }));
}

export async function pickMenuItem(label: RegExp) {
  await userEvent.click(await screen.findByRole("menuitem", { name: label }));
}

export async function openCustom() {
  await screen.findByText("/users/{id}");
  await userEvent.click(screen.getByRole("button", { name: /api_studio\.custom_collection/i }));
}

export async function withCollection() {
  readProjectRoutes.mockResolvedValue(scanResult({ routes: [route(), postRoute()] }));
  renderPage();
  await openCustom();
  await userEvent.click(screen.getByRole("button", { name: /api_studio\.new_collection$/i }));
}

export async function pickFirstRoute() {
  await userEvent.click(screen.getByRole("checkbox", { name: /\/users\/\{id\}/ }));
  await userEvent.click(screen.getByRole("button", { name: /api_studio\.add_requests/i }));
}

export function savedCollections() {
  const calls = saveApiCollections.mock.calls;

  return calls[calls.length - 1]?.[1] ?? [];
}
