import { SettingsPage } from "@renderer/features/settings/pages/SettingsPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function SettingsRoute() {
  const { environment } = useLazifyStore();

  return <SettingsPage environment={environment} />;
}
