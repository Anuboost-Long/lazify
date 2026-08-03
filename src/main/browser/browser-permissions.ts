import { session } from "electron";

import { BROWSER_PARTITION } from "./preview-guard";

/**
 * What a page in the browser session is allowed to ask for.
 *
 * Electron's default is to grant nearly everything without asking, because a
 * normal Electron app only ever loads its own pages. This one loads the open
 * web, where a page that can call `Notification.requestPermission()` and be
 * told yes is a page that can sell push spam — which is exactly what the ad
 * scripts on a streaming site do the moment playback starts.
 *
 * There is no permission UI here to prompt with, so this is an allow-list
 * rather than a deny-list: a capability that has no consequence for a page the
 * user is only reading is granted, and anything that reaches the user, the
 * machine, or hardware is refused. A new permission in a future Electron is
 * refused by default rather than quietly granted.
 */
const ALLOWED = new Set([
  // Video wants all three, and they cost nothing outside the page.
  "fullscreen",
  "pointerLock",
  "keyboardLock",
  // Paid streaming will not play at all without it.
  "mediaKeySystem",
  // Writing to the clipboard is how a page's own copy button works; the
  // sanitized form is the one that cannot forge arbitrary flavours.
  "clipboard-sanitized-write"
]);

function isAllowed(permission: string): boolean {
  return ALLOWED.has(permission);
}

/**
 * Applies the policy to the browser session. Must run before the first page
 * loads, or a restored tab gets its permissions under Electron's defaults.
 */
export function installBrowserPermissionPolicy(): void {
  const ses = session.fromPartition(BROWSER_PARTITION);

  ses.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(isAllowed(permission));
  });

  // The synchronous half, and the more useful one against push ads: it is what
  // `Notification.permission` and `navigator.permissions.query()` read. Left to
  // the default the answer is "default" — an invitation to prompt — and the ad
  // script draws its subscribe card. Answering "denied" ends it before it draws.
  ses.setPermissionCheckHandler((_contents, permission) => isAllowed(permission));
}
