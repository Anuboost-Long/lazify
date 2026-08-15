import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageCrumb } from "@renderer/app/components/PageChrome";
import { translation } from "@renderer/i18n/translation";
import { dmgCompilerTool } from "@renderer/features/tools/catalog";
import { ToolCrumb } from "@renderer/features/tools/components/ToolCrumb";
import { ToolPageBody } from "@renderer/features/tools/components/ToolPageBody";
import { MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { AppHeader } from "../components/AppHeader";
import { AppPickerDropzone } from "../components/AppPickerDropzone";
import { AppStatusTiles } from "../components/AppStatusTiles";
import { BuildForm } from "../components/BuildForm";
import { BuildOutcome } from "../components/BuildOutcome";
import { MacOnlyNotice } from "../components/MacOnlyNotice";
import { WarningNotice } from "../components/WarningNotice";
import { useDmgCompiler } from "../hooks/use-dmg-compiler";

/**
 * DMG compiler: a built `.app` in, a disk image anyone can install from out.
 *
 * Dressed like the rest of the tools — one bordered panel on `bg-soft`, the
 * tool's own colour on its icon, and the same radii the other pages use. This
 * file is the shell only: the drop target, the panel, and which of its two
 * states is showing. Everything with markup of its own lives in `../components`.
 */
export function DmgCompilerPage() {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const compiler = useDmgCompiler();
  const { app, progress, result, error, building, chooseApp, dropApp, reset } = compiler;

  if (globalThis.lazify.platform !== "darwin") return <MacOnlyNotice />;

  return (
    // A tool fills the window and scrolls its own content, the way the rest of
    // the tool pages do.
    <div className="flex h-full min-h-0 flex-col">
      <ToolCrumb tool={dmgCompilerTool} />

      {/* The shell already names the page, so the breadcrumb tail carries what
          is being worked on instead of repeating the title. */}
      {app ? (
        <PageCrumb>
          <UiIcon name="arrow-right" className="h-3 w-3 shrink-0 text-muted" />
          <MonoText as="span" className="truncate text-[11px] text-muted">
            {app.suggestedFileName}
          </MonoText>
        </PageCrumb>
      ) : null}

      <ToolPageBody>
        <div className="flex items-center justify-end gap-3">
          {app && !building ? (
            <button
              type="button"
              onClick={reset}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5",
                "text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
              )}
            >
              <UiIcon name="arrow-left" className="h-3 w-3" />
              {t(translation.DmgCompiler.StartOver)}
            </button>
          ) : null}
        </div>

      {/* ── The framed surface ───────────────────────────────────────────── */}
      <section
        onDragOver={(event) => {
          event.preventDefault();
          if (!building) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!building) void dropApp(event.dataTransfer.files);
        }}
        className={clsx(
          "group relative overflow-hidden rounded-2xl border bg-soft p-6",
          "transition-colors duration-200",
          dragging ? "border-accent bg-accent/[0.04]" : "border-border"
        )}
      >
        {/* The breadcrumb already names the tool, so the header waits until it
            has something of its own to say: which app was picked, its version
            and its icon. Empty, the panel is only the target. */}
        {app ? (
          <>
            <AppHeader app={app} building={building} onChangeApp={() => void chooseApp()} />
            <AppStatusTiles sizeBytes={app.sizeBytes} />

            <div className="relative mt-5 rounded-xl border border-border bg-bg p-4">
              <BuildForm {...compiler} app={app} step={progress?.step ?? "staging"} />
            </div>
          </>
        ) : (
          <AppPickerDropzone dragging={dragging} onChoose={() => void chooseApp()} />
        )}
      </section>

      {/* A bundle that could not be read. Build failures live on `result`. */}
      {error ? <WarningNotice message={error} /> : null}

      {result ? <BuildOutcome result={result} /> : null}
      </ToolPageBody>
    </div>
  );
}
