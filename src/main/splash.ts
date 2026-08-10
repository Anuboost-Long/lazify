import { BrowserWindow } from "electron";
import fs from "node:fs";

import { APP_ICON_PATH } from "./icon-path";

const WIDTH = 380;
const HEIGHT = 300;

let splashWindow: BrowserWindow | null = null;

// The splash is a frameless data: URL window, so the icon has to travel inside
// the markup — APP_ICON_PATH is what makes the same call work in dev and from
// the packaged resources folder.
function readIconDataUri(): string {
  try {
    return `data:image/png;base64,${fs.readFileSync(APP_ICON_PATH).toString("base64")}`;
  } catch {
    // A missing icon is not worth failing a launch over — the card still draws.
    return "";
  }
}

function splashHtml(): string {
  const icon = readIconDataUri();

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%;
    background: transparent; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-user-select: none; user-select: none;
  }
  .card {
    position: relative; width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 18px;
    border-radius: 20px; overflow: hidden;
    /* Same navy the renderer boots into, so the handover is invisible. */
    background: radial-gradient(120% 120% at 50% 0%, #16233b 0%, #0b1220 62%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    animation: rise 0.45s cubic-bezier(0.2, 0.8, 0.25, 1) both;
  }
  /* Faint grid echoing the plate the logo sits on. */
  .card::before {
    content: ""; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(16, 185, 129, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 185, 129, 0.07) 1px, transparent 1px);
    background-size: 28px 28px;
    -webkit-mask-image: radial-gradient(70% 70% at 50% 42%, #000 0%, transparent 100%);
  }
  .mark { position: relative; display: grid; place-items: center; width: 104px; height: 104px; }
  .halo {
    position: absolute; width: 156px; height: 156px; border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 65%);
    animation: pulse 2.6s ease-in-out infinite;
  }
  .ring {
    position: absolute; inset: -7px; border-radius: 27px; filter: blur(7px);
    background: conic-gradient(from 0turn, transparent 190deg, rgba(16, 185, 129, 0.9) 335deg, transparent 360deg);
    animation: spin 1.9s linear infinite;
  }
  .mark img {
    position: relative; width: 88px; height: 88px; border-radius: 20px; display: block;
    animation: pop 0.55s cubic-bezier(0.2, 0.8, 0.25, 1) both,
               float 3.4s ease-in-out 0.55s infinite;
  }
  .word {
    font-size: 19px; font-weight: 600; color: #e5e7eb;
    letter-spacing: 0.34em; text-indent: 0.34em;
    animation: fade 0.5s ease 0.18s both;
  }
  .bar {
    position: relative; width: 132px; height: 3px; border-radius: 99px;
    background: rgba(255, 255, 255, 0.09); overflow: hidden;
    animation: fade 0.5s ease 0.28s both;
  }
  .bar::after {
    content: ""; position: absolute; top: 0; left: 0; height: 100%; width: 42%;
    border-radius: 99px;
    background: linear-gradient(90deg, transparent, #10b981, #6ee7b7, transparent);
    animation: sweep 1.25s ease-in-out infinite;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes pop { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: scale(1); } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes spin { to { transform: rotate(1turn); } }
  @keyframes pulse { 0%, 100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.06); } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes sweep { 0% { left: -45%; } 100% { left: 100%; } }
  /* Motion here is decoration; anyone who has opted out just gets the card. */
  @media (prefers-reduced-motion: reduce) {
    .card, .mark img, .ring, .halo, .word, .bar, .bar::after { animation: none; }
    .bar::after { left: 0; width: 100%; opacity: 0.7; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">
      <div class="halo"></div>
      <div class="ring"></div>
      ${icon ? `<img src="${icon}" alt="" />` : ""}
    </div>
    <div class="word">LAZIFY</div>
    <div class="bar"></div>
  </div>
</body>
</html>`;
}

export function showSplash(): BrowserWindow {
  if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;

  const window = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    // A launch card is chrome-less and cannot be interacted with: no frame, no
    // resize, no taskbar entry, and out of the way once the real window lands.
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    center: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: undefined,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml())}`);

  // Showing on first paint keeps the splash from flashing its own empty frame —
  // the very thing it exists to stop the main window doing.
  window.once("ready-to-show", () => {
    if (!window.isDestroyed()) window.show();
  });

  window.on("closed", () => {
    if (splashWindow === window) splashWindow = null;
  });

  splashWindow = window;
  return window;
}

export function closeSplash(): void {
  const window = splashWindow;
  if (!window || window.isDestroyed()) {
    splashWindow = null;
    return;
  }

  // Cleared up front so a second call cannot start a competing fade.
  splashWindow = null;

  let opacity = 1;
  const timer = setInterval(() => {
    if (window.isDestroyed()) {
      clearInterval(timer);
      return;
    }

    opacity -= 0.12;

    if (opacity <= 0) {
      clearInterval(timer);
      window.destroy();
      return;
    }

    window.setOpacity(opacity);
  }, 16);
}
