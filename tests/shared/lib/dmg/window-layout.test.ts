import { describe, expect, it } from "vitest";

import { layoutScript, windowLayout } from "@/shared/lib/dmg/window-layout";

describe("windowLayout", () => {
	it("falls back to the default size with no backdrop", () => {
		expect(windowLayout(null)).toEqual({
			width: 660,
			height: 400,
			appX: 172,
			applicationsX: 488,
			iconY: 184,
		});
	});

	it("sizes the window to a backdrop within range", () => {
		const layout = windowLayout({ width: 800, height: 500 });

		expect(layout.width).toBe(800);
		expect(layout.height).toBe(500);
	});

	it("clamps a backdrop smaller than the minimum window", () => {
		const layout = windowLayout({ width: 100, height: 100 });

		expect(layout.width).toBe(420);
		expect(layout.height).toBe(300);
	});

	it("clamps a backdrop larger than the maximum window", () => {
		const layout = windowLayout({ width: 5000, height: 4000 });

		expect(layout.width).toBe(1400);
		expect(layout.height).toBe(900);
	});
});

describe("layoutScript", () => {
	it("places the app at a quarter width and Applications at three-quarters", () => {
		const script = layoutScript("MyApp", "MyApp.app", windowLayout(null), null);

		expect(script).toContain('set position of item "MyApp.app" of container window to {172, 184}');
		expect(script).toContain('set position of item "Applications" of container window to {488, 184}');
	});

	it("adds the backdrop line only when there is one", () => {
		const plain = layoutScript("MyApp", "MyApp.app", windowLayout(null), null);
		const dressed = layoutScript("MyApp", "MyApp.app", windowLayout(null), "background.png");

		expect(plain).not.toContain("background picture");
		expect(dressed).toContain('set background picture of viewOptions to file ".background:background.png"');
	});

	it("escapes a disk name carrying a quote or a backslash", () => {
		const script = layoutScript('My "App" \\ Build', "MyApp.app", windowLayout(null), null);

		expect(script).toContain('tell disk "My \\"App\\" \\\\ Build"');
	});
});
