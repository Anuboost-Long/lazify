import { dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import { compileDmg, defaultOutputPath, inspectAppBundle, readImagePreview } from "../dmg-compiler";
import type { AppBundleInfo, DmgResult } from "../dmg-compiler";
import type { IpcContext } from "./context";

export function registerDmgHandlers(ctx: IpcContext) {
  ipcMain.handle("lazify:select-app-bundle", async (): Promise<string | null> => {
    const options: OpenDialogOptions = {
      title: "Choose a macOS app",
      // No `treatPackageAsDirectory`: the bundle is what is being picked, and
      // letting the picker descend into it only invites choosing a file inside.
      properties: ["openFile"],
      filters: [{ name: "Application", extensions: ["app"] }]
    };
    const result = ctx.mainWindow
      ? await dialog.showOpenDialog(ctx.mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) return null;

    return result.filePaths[0] ?? null;
  });

  ipcMain.handle(
    "lazify:select-dmg-destination",
    async (_event, suggestedPath: string): Promise<string | null> => {
      const result = ctx.mainWindow
        ? await dialog.showSaveDialog(ctx.mainWindow, {
            title: "Where should the disk image go?",
            defaultPath: suggestedPath,
            filters: [{ name: "Disk Image", extensions: ["dmg"] }]
          })
        : await dialog.showSaveDialog({
            title: "Where should the disk image go?",
            defaultPath: suggestedPath,
            filters: [{ name: "Disk Image", extensions: ["dmg"] }]
          });

      if (result.canceled || !result.filePath) return null;

      return result.filePath;
    }
  );

  ipcMain.handle(
    "lazify:inspect-app-bundle",
    async (_event, appPath: string): Promise<AppBundleInfo> => inspectAppBundle(appPath)
  );

  // The two images the mounted window can be dressed with. One picker for both:
  // the only thing that differs is the title, and a backdrop and a volume icon
  // accept exactly the same formats.
  ipcMain.handle(
    "lazify:select-dmg-image",
    async (_event, kind: "background" | "icon"): Promise<string | null> => {
      const options: OpenDialogOptions = {
        title:
          kind === "icon" ? "Choose an icon for the disk" : "Choose a background for the window",
        properties: ["openFile"],
        filters: [
          {
            name: "Image",
            extensions: ["png", "jpg", "jpeg", "tif", "tiff", "gif", "bmp", "heic", "icns"]
          }
        ]
      };
      const result = ctx.mainWindow
        ? await dialog.showOpenDialog(ctx.mainWindow, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled) return null;

      return result.filePaths[0] ?? null;
    }
  );

  // Thumbnails for the page. A data URL rather than a `file://` src because the
  // renderer is served over http in development, where a local file will not
  // load at all.
  ipcMain.handle(
    "lazify:dmg-image-preview",
    async (_event, imagePath: string, maxPixels?: number): Promise<string | null> =>
      readImagePreview(imagePath, maxPixels)
  );

  ipcMain.handle(
    "lazify:default-dmg-path",
    async (_event, appPath: string, suggestedFileName: string): Promise<string> =>
      defaultOutputPath(appPath, suggestedFileName)
  );

  ipcMain.handle(
    "lazify:compile-dmg",
    async (
      _event,
      appPath: string,
      outputPath: string,
      volumeName?: string | null,
      backgroundImagePath?: string | null,
      volumeIconPath?: string | null
    ): Promise<DmgResult> =>
      compileDmg(
        { appPath, outputPath, volumeName, backgroundImagePath, volumeIconPath },
        (progress) => ctx.emitToRenderer("lazify:dmg-progress", progress)
      )
  );
}
