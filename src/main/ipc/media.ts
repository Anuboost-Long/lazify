import { ipcMain } from "electron";
import { toggleMediaPictureInPicture } from "../media/media-pip";
import { closePictureInPicture, getPictureInPictureState, openPictureInPicture } from "../media/picture-in-picture";
import type { PictureInPictureSource } from "../media/picture-in-picture";

export function registerMediaHandlers() {
  // Picture in picture: the page in a floating always-on-top window. The
  // surface that asked decides the session it joins and how far it may go.
  ipcMain.handle(
    "lazify:open-picture-in-picture",
    async (_event, url: string, source: PictureInPictureSource) =>
      openPictureInPicture(url, source)
  );

  ipcMain.handle("lazify:close-picture-in-picture", async () => closePictureInPicture());

  ipcMain.handle("lazify:picture-in-picture-state", async () => getPictureInPictureState());

  // The other kind: the page's own video in the OS mini player. Driven from
  // here because the video is often inside a frame the renderer cannot reach.
  ipcMain.handle("lazify:toggle-media-picture-in-picture", async (_event, webContentsId: number) =>
    toggleMediaPictureInPicture(webContentsId)
  );
}
