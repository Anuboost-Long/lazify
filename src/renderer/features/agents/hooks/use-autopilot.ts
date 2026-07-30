import { atom, useAtom } from "jotai";
import { useCallback, useEffect } from "react";

import type { AutopilotSettings } from "../../../../main/agents/autopilot-store";

/**
 * Autopilot's switches, as the panel sees them.
 *
 * Main is the authority — it reads the stored settings on every prompt — so this
 * holds nothing but a mirror for the toggles to render from, refreshed with
 * whatever main returns after a write.
 */

const settingsAtom = atom<AutopilotSettings>({ enabled: false, excludedProjects: [] });

/** Module scope: the settings are global, so one read per renderer load is enough. */
let loaded = false;

export function useAutopilot(projectPath: string) {
  const [settings, setSettings] = useAtom(settingsAtom);

  useEffect(() => {
    if (loaded) return;
    loaded = true;

    void globalThis.lazify.autopilotSettings().then(setSettings);
  }, [setSettings]);

  return {
    /** The master switch. Off means autopilot answers nothing, anywhere. */
    enabled: settings.enabled,
    /** Whether it is active in the project on screen. */
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
