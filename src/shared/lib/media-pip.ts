import type { Guest } from "@/platform/browser-view";

export type MediaPipResult = import("@/shared/lib/media/media-pip").MediaPipResult;

export async function toggleMediaPictureInPicture(
  view: Guest
): Promise<MediaPipResult> {
  try {
    return await globalThis.lazify.toggleMediaPictureInPicture(view.getWebContentsId());
  } catch {
    return "none";
  }
}
