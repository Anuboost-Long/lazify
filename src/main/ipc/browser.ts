import { ipcMain } from "electron";
import { getLazyShieldState, setLazyShieldEnabled } from "../browser/lazy-shield";
import { allowPopupsFrom } from "../browser/popup-policy";
import { openExternalUrl } from "../browser/preview-guard";

export function registerBrowserHandlers() {
  ipcMain.handle("lazify:lazy-shield-state", async () => getLazyShieldState());

  ipcMain.handle("lazify:set-lazy-shield", async (_event, next: boolean) =>
    setLazyShieldEnabled(next)
  );

  // "Always allow on this site" from the blocked-popup strip. The allowance is
  // granted to the page that asked, not to the address it wanted to open.
  ipcMain.handle("lazify:allow-popups-from", async (_event, sourceUrl: string) =>
    allowPopupsFrom(sourceUrl)
  );

  // "Open in browser" from the preview toolbar — the one way a URL is meant to
  // leave the app, so it takes the same http(s)-only path as a diverted link.
  ipcMain.handle("lazify:open-external-url", async (_event, url: string) => openExternalUrl(url));
}
