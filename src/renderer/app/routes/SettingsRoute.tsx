import { SettingsPage } from "@renderer/features/settings/pages/SettingsPage";
import { useAppShellContext } from "../app-shell-context";

export function SettingsRoute() {
  const { environment } = useAppShellContext();

  return <SettingsPage environment={environment} />;
}
