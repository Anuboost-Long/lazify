import { Menu, app, type BrowserWindow, type MenuItemConstructorOptions } from "electron";

import { resetZoom, stepZoom } from "./window-zoom";

export function buildAppMenu(windowOf: () => BrowserWindow | null) {
  const onMac = process.platform === "darwin";

  const appMenu: MenuItemConstructorOptions[] = onMac
    ? [
        {
          label: app.getName(),
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }
      ]
    : [];

  const view: MenuItemConstructorOptions = {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      {
        label: "Actual Size",
        accelerator: "CommandOrControl+0",
        click: () => resetZoom(windowOf())
      },
      {
        label: "Zoom In",
        accelerator: "CommandOrControl+Plus",
        click: () => stepZoom(windowOf(), 1)
      },
      {
        label: "Zoom In",
        visible: false,
        acceleratorWorksWhenHidden: true,
        accelerator: "CommandOrControl+=",
        click: () => stepZoom(windowOf(), 1)
      },
      {
        label: "Zoom Out",
        accelerator: "CommandOrControl+-",
        click: () => stepZoom(windowOf(), -1)
      },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  };

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...appMenu,
      {
        label: "File",
        submenu: [onMac ? { role: "close" } : { role: "quit" }]
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          ...(onMac
            ? ([{ role: "pasteAndMatchStyle" }, { role: "delete" }] as MenuItemConstructorOptions[])
            : ([{ role: "delete" }] as MenuItemConstructorOptions[])),
          { role: "selectAll" }
        ]
      },
      view,
      {
        label: "Window",
        submenu: onMac
          ? [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }]
          : [{ role: "minimize" }, { role: "close" }]
      }
    ])
  );
}
