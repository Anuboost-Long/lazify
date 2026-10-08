import { Outlet } from "react-router-dom";

import NavBar from "@/app/NavBar";
import { useFirstLaunchImport } from "@/features/migration/hooks/useFirstLaunchImport";

export default function RootLayout() {
  useFirstLaunchImport();

  return (
    <div className="min-h-screen bg-chain-cream text-chain-navy dark:bg-chain-navy dark:text-chain-cream">
      <NavBar />
      <Outlet />
    </div>
  );
}
