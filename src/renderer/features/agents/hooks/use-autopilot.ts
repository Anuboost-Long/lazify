import { atom, useAtom } from "jotai";
import { useCallback, useEffect } from "react";

import type { AutopilotSettings } from "../../../../main/agents/autopilot-store";

const settingsAtom = atom<AutopilotSettings>({ enabled: false, excludedProjects: [] });

let loaded = false;

export function useAutopilot(projectPath: string) {
  const [settings, setSettings] = useAtom(settingsAtom);

  useEffect(() => {
    if (loaded) return;
    loaded = true;

    void globalThis.lazify.autopilotSettings().then(setSettings);
  }, [setSettings]);

  return {
    enabled: settings.enabled,

    projectEnabled: settings.enabled && !settings.excludedProjects.includes(projectPath),
    setEnabled: useCallback(
      (next: boolean) => {
        void globalThis.lazify.setAutopilot(next).then(setSettings);
      },
      [setSettings],
    ),
    setProjectEnabled: useCallback(
      (next: boolean) => {
        void globalThis.lazify.setAutopilotProject(projectPath, next).then(setSettings);
      },
      [projectPath, setSettings],
    ),
  };
}
