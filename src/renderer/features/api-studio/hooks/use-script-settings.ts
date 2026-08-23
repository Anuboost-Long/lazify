import { useEffect, useRef, useState } from "react";

import { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "@main/api-studio/scripting/global-name";
import { translation } from "@renderer/i18n/translation";
import { reportFailure } from "@renderer/shared/ui/toast/failure-toast";

export function useScriptSettings(projectPath: string) {
  const [globalName, setGlobalName] = useState(DEFAULT_SCRIPT_GLOBAL);
  const openProjectPath = useRef(projectPath);

  useEffect(() => {
    openProjectPath.current = projectPath;
    setGlobalName(DEFAULT_SCRIPT_GLOBAL);

    if (!projectPath) return;

    void globalThis.lazify
      .readScriptSettings(projectPath)
      .then((settings) => {
        if (openProjectPath.current === projectPath) setGlobalName(settings.global);
      })
      .catch(() => undefined);
  }, [projectPath]);

  return {
    globalName,
    setGlobalName: (name: string) => {
      if (!isUsableGlobal(name)) return;

      setGlobalName(name);

      if (!projectPath) return;

      void globalThis.lazify.saveScriptSettings(projectPath, { global: name }).catch(() =>
        reportFailure(translation.GlobalTerm.NotSaved, translation.GlobalTerm.NotSavedDesc)
      );
    }
  };
}
