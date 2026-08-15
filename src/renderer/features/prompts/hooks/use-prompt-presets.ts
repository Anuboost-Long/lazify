import { useCallback, useEffect, useState } from "react";

import type { PromptPreset, PromptPresetInput } from "@main/prompts/types";

export function usePromptPresets() {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const loaded = await globalThis.lazify.listPromptPresets();
    setPresets(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: PromptPresetInput) => {
      const created = await globalThis.lazify.createPromptPreset(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, input: PromptPresetInput) => {
      await globalThis.lazify.updatePromptPreset(id, input);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await globalThis.lazify.deletePromptPreset(id);
      await refresh();
    },
    [refresh]
  );

  return { presets, loading, refresh, create, update, remove };
}
