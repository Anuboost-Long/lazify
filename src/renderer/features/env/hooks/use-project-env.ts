import { useCallback, useEffect, useState } from "react";

import type { EnvFileSummary, EnvVariablePatch, ProjectEnvFile } from "@renderer/shared/types/lazify";

/**
 * The env files of one project, and the edits made to them.
 *
 * Main returns the whole re-parsed file from every mutation, so this holds no
 * optimistic copy: an edit either lands and replaces the file, or fails and
 * leaves what is on screen alone with the reason attached. Line numbers shift
 * when a variable is added or removed, and taking main's word for them is what
 * keeps the next edit aimed at the right row.
 */
export function useProjectEnv(projectPath: string | null, active: boolean) {
  const [files, setFiles] = useState<EnvFileSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<ProjectEnvFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

  const loadFiles = useCallback(async () => {
    if (!projectPath) return;

    setLoading(true);
    setError(null);
    try {
      const found = await globalThis.lazify.listEnvFiles(projectPath);
      setFiles(found);
      // Keep the open file open across a refresh; fall back to the first.
      setSelected((current) =>
        current && found.some((entry) => entry.name === current) ? current : (found[0]?.name ?? null)
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Panels stay mounted while their rail button is off, so the read waits for
  // the panel to actually be open rather than firing for every project visited.
  useEffect(() => {
    if (!active || !projectPath) return;
    void loadFiles();
  }, [active, projectPath, loadFiles]);

  useEffect(() => {
    setSelected(null);
    setFile(null);
  }, [projectPath]);

  useEffect(() => {
    if (!active || !projectPath || !selected) {
      setFile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    globalThis.lazify
      .readEnvFile(projectPath, selected)
      .then((next) => {
        if (!cancelled) {
          setFile(next);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(message(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, projectPath, selected]);

  /**
   * Runs one mutation and adopts the file it returns. The summary list is
   * refreshed alongside it so the disabled/total counts on the file tabs keep
   * up with the edit that just changed them.
   */
  const apply = useCallback(
    async (run: (project: string, fileName: string) => Promise<ProjectEnvFile>) => {
      if (!projectPath || !selected) return false;

      setError(null);
      try {
        setFile(await run(projectPath, selected));
        setFiles(await globalThis.lazify.listEnvFiles(projectPath));
        return true;
      } catch (cause) {
        setError(message(cause));
        return false;
      }
    },
    [projectPath, selected]
  );

  const update = useCallback(
    (line: number, key: string, patch: EnvVariablePatch) =>
      apply((project, fileName) =>
        globalThis.lazify.updateEnvVariable(project, fileName, line, key, patch)
      ),
    [apply]
  );

  const remove = useCallback(
    (line: number, key: string) =>
      apply((project, fileName) => globalThis.lazify.deleteEnvVariable(project, fileName, line, key)),
    [apply]
  );

  const add = useCallback(
    (key: string, value: string) =>
      apply((project, fileName) => globalThis.lazify.addEnvVariable(project, fileName, key, value)),
    [apply]
  );

  const create = useCallback(
    async (fileName: string) => {
      if (!projectPath) return false;

      setError(null);
      try {
        await globalThis.lazify.createEnvFile(projectPath, fileName);
        await loadFiles();
        setSelected(fileName);
        return true;
      } catch (cause) {
        setError(message(cause));
        return false;
      }
    },
    [projectPath, loadFiles]
  );

  return {
    files,
    selected,
    file,
    loading,
    error,
    select: setSelected,
    refresh: loadFiles,
    update,
    remove,
    add,
    create
  };
}
