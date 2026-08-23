import { Provider } from "jotai";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";
import { initialLanguageReady } from "./i18n/i18n";
import "./styles.css";

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
  requestAnimationFrame(() => globalThis.lazify?.signalRendererReady());
});
