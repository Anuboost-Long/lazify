import { Provider } from "jotai";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";
import "./i18n/i18n";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
);
