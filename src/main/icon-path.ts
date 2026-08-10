import { app } from "electron";
import path from "node:path";

// electron-builder silently drops anything under `directories.buildResources`
// (`build/`) from the packaged app, even when listed in `files` — so this
// can't be read from inside the asar. The builder configs instead copy it via
// extraResources into the resources folder, same as templates/.
export const APP_ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "icon.png")
  : path.join(app.getAppPath(), "build/icon.png");
