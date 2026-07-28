export type MediaPipResult = import("../../../main/media-pip").MediaPipResult;

export async function toggleMediaPictureInPicture(
  view: LazifyWebviewElement
): Promise<MediaPipResult> {
  try {
    return await globalThis.lazify.toggleMediaPictureInPicture(view.getWebContentsId());
  } catch {
    return "none";
  }
}
