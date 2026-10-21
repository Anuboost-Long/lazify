// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { appRoute, getWorkspaceProjectRoute } from "@/app/app-routes";
import { useRouteMemory } from "@/shared/hooks/use-route-memory";

describe("returning to a page where the user left it", () => {
	it("leads back to the project last open in the workspace", () => {
		const { result } = renderHook(() => useRouteMemory());
		const project = getWorkspaceProjectRoute("/Users/me/site");

		act(() => result.current.remember(project));

		expect(result.current.recall(appRoute.workspace)).toBe(project);
	});

	it("starts on the page's own root once the user went back to it", () => {
		const { result } = renderHook(() => useRouteMemory());

		act(() => result.current.remember(getWorkspaceProjectRoute("/Users/me/site")));
		act(() => result.current.remember(appRoute.workspace));

		expect(result.current.recall(appRoute.workspace)).toBe(appRoute.workspace);
		expect(JSON.parse(globalThis.localStorage.getItem("lazify-route-memory") ?? "{}")).not.toHaveProperty("workspace");
	});
});
