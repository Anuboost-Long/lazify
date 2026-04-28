import { HashRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

export function AppRouter() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
