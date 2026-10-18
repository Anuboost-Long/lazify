import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { isSettingsSection, type SettingsSection } from "@/features/settings/components/settings-config";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

// Coming back to Settings without naming a section opens the one left last.
const lastSectionAtom = atom<SettingsSection>("appearance");

export function SettingsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lastSection, setLastSection] = useAtom(lastSectionAtom);
  const requested = searchParams.get("section");
  const activeSection = requested && isSettingsSection(requested) ? requested : lastSection;

  useEffect(() => setLastSection(activeSection), [activeSection, setLastSection]);

  return (
    <SettingsPage
      activeSection={activeSection}
      onSectionChange={(section) => setSearchParams({ section }, { replace: true })}
    />
  );
}
