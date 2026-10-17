import type { BrowserViewFrameResult } from "@chain/sdk";
import { describe, expect, it } from "vitest";

import { toggleMediaPictureInPicture } from "@/shared/lib/media/media-pip";

const PAGE = { url: "https://news.example.com/", mainFrame: true };
const EMBED = { url: "https://player.example.net/embed/1", mainFrame: false };
const AD = { url: "https://ads.example.org/frame", mainFrame: false };

/** A page whose frames answer each script the way a real one would. */
function page(answers: { exit: Record<string, boolean>; probe: Record<string, string>; enter: Record<string, string> }) {
	const bodies: string[] = [];
	const run = async (body: string): Promise<BrowserViewFrameResult[]> => {
		bodies.push(body);
		return [PAGE, AD, EMBED].map((frame) => {
			if (body.includes("exitPictureInPicture")) return { frame, value: answers.exit[frame.url] ?? false };
			if (body.includes('"candidate"')) return { frame, value: answers.probe[frame.url] ?? "none" };
			const target = /location\.href !== "([^"]+)"/.exec(body)?.[1];
			return { frame, value: frame.url === target ? (answers.enter[frame.url] ?? "none") : "skip" };
		});
	};
	return { run, bodies };
}

describe("media picture in picture", () => {
	it("leaves it when any frame is in it, and asks nothing else", async () => {
		const { run, bodies } = page({ exit: { [EMBED.url]: true }, probe: {}, enter: {} });

		expect(await toggleMediaPictureInPicture(run)).toBe("exited");
		expect(bodies).toHaveLength(1);
	});

	it("enters from the first frame with a video, reaching into a cross-origin embed", async () => {
		const { run, bodies } = page({
			exit: {},
			probe: { [EMBED.url]: "candidate" },
			enter: { [EMBED.url]: "entered" },
		});

		expect(await toggleMediaPictureInPicture(run)).toBe("entered");
		expect(bodies.at(-1)).toContain(JSON.stringify(EMBED.url));
	});

	it("moves on to the next frame when the first can't", async () => {
		const { run } = page({
			exit: {},
			probe: { [AD.url]: "candidate", [EMBED.url]: "candidate" },
			enter: { [AD.url]: "unsupported", [EMBED.url]: "entered" },
		});

		expect(await toggleMediaPictureInPicture(run)).toBe("entered");
	});

	it("says there's no video, or that the page can't", async () => {
		expect(await toggleMediaPictureInPicture(page({ exit: {}, probe: {}, enter: {} }).run)).toBe("none");
		expect(
			await toggleMediaPictureInPicture(page({ exit: {}, probe: { [PAGE.url]: "unsupported" }, enter: {} }).run),
		).toBe("unsupported");
	});
});
