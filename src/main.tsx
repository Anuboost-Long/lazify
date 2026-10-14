import { Provider } from "jotai";
import React from "react";
import ReactDOM from "react-dom/client";

import { lazify } from "@/platform/lazify";
import { applyStoredZoom } from "@/platform/zoom";
import { installGlobalErrorLogging } from "@/shared/lib/diagnostics/global-errors";

import App from "./app/App";
import { initialLanguageReady } from "./i18n/i18n";
import "./styles.css";

installGlobalErrorLogging();

globalThis.lazify = lazify;

await applyStoredZoom();

await initialLanguageReady;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
);

// Dismisses the splash. Two frames deep because the first only tells us the
// commit is scheduled — by the second, the app has actually been painted, so
// the window that replaces the splash is never handed over empty.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    globalThis.lazify?.signalRendererReady();
    // The first spawn also resolves the login-shell PATH (~1s) — pay it here,
    // not when the user opens their first agent.
    void lazify.listAgents().catch(() => undefined);
  });
});
