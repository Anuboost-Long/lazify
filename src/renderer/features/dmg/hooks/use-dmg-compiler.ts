import { useCallback, useEffect, useState } from "react";

/**
 * The state behind one build: which app, what it will be called, where it goes.
 *
 * Local rather than global on purpose — a half-configured build is not something
 * to come back to from another page, and the only lasting product is a file on
 * disk that the page shows the path to.
 */

type AppBundleInfo = Awaited<ReturnType<typeof globalThis.lazify.inspectAppBundle>>;
type DmgResult = Awaited<ReturnType<typeof globalThis.lazify.compileDmg>>;
type DmgProgress = Parameters<Parameters<typeof globalThis.lazify.onDmgProgress>[0]>[0];

export function useDmgCompiler() {
  const [app, setApp] = useState<AppBundleInfo | null>(null);
  const [volumeName, setVolumeName] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [progress, setProgress] = useState<DmgProgress | null>(null);
  const [result, setResult] = useState<DmgResult | null>(null);
  /** A picked app that could not be read. Build failures live on `result`. */
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => globalThis.lazify.onDmgProgress(setProgress), []);

  /** Reads a bundle and fills the form from it. Shared by the picker and drops. */
  const loadApp = useCallback(async (appPath: string) => {
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const info = await globalThis.lazify.inspectAppBundle(appPath);

      setApp(info);
      // Both prefilled from the bundle, so a build needs nothing but the button.
      setVolumeName(info.name);
      setOutputPath(await globalThis.lazify.defaultDmgPath(info.appPath, info.suggestedFileName));
    } catch (cause) {
      setApp(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  const chooseApp = useCallback(async () => {
    const picked = await globalThis.lazify.selectAppBundle();
    if (!picked) return;

    await loadApp(picked);
  }, [loadApp]);

  /**
   * Takes the first thing dropped on the page.
   *
   * Only the first: dropping a folder of builds is a reasonable thing to try,
   * and quietly packaging one of them would be worse than packaging the one the
   * user let go of first. `inspectAppBundle` rejects whatever is not a bundle.
   */
  const dropApp = useCallback(
    async (files: FileList) => {
      const dropped = files.item(0);
      if (!dropped) return;

      const appPath = globalThis.lazify.pathForDroppedFile(dropped);

      if (!appPath) {
        setApp(null);
        setError(null);
        // Nothing with a path on disk — there is no bundle here to read, and the
        // picker is right there.
        return;
      }

      await loadApp(appPath);
    },
    [loadApp],
  );

  const chooseDestination = useCallback(async () => {
    if (!app) return;

    const picked = await globalThis.lazify.selectDmgDestination(outputPath || app.suggestedFileName);
    if (!picked) return;

    setResult(null);
    setOutputPath(picked);
  }, [app, outputPath]);

  const build = useCallback(async () => {
    if (!app || !outputPath) return;

    setBuilding(true);
    setResult(null);
    setProgress(null);

    try {
      setResult(await globalThis.lazify.compileDmg(app.appPath, outputPath, volumeName));
    } finally {
      setBuilding(false);
      setProgress(null);
    }
  }, [app, outputPath, volumeName]);

  return {
    app,
    volumeName,
    setVolumeName,
    outputPath,
    progress,
    result,
    error,
    building,
    chooseApp,
    dropApp,
    chooseDestination,
    build,
    reset: useCallback(() => {
      setApp(null);
      setVolumeName("");
      setOutputPath("");
      setResult(null);
      setError(null);
      setProgress(null);
    }, [])
  };
}
