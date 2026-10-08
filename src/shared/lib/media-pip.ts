export type MediaPipResult = import("@/shared/lib/media/media-pip").MediaPipResult;

export async function toggleMediaPictureInPicture(
  view: LazifyWebviewElement
): Promise<MediaPipResult> {
  try {
    return await globalThis.lazify.toggleMediaPictureInPicture(view.getWebContentsId());
  } catch {
    return "none";
  }
}
