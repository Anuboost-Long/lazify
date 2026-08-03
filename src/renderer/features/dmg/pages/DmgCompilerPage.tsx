import clsx from "clsx";
import { useState } from "react";

import { PageCrumb } from "@renderer/app/components/PageChrome";
import { MonoText } from "@renderer/shared/typography";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
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
 * Built to the project's playful-doc-console direction — one framed surface with
 * clipped artwork, a header cluster, status tiles, and a panel holding the
 * interactive part. Neutral surfaces throughout; state is carried by a rail, an
 * icon chip and one pill rather than by washing anything in colour.
 *
 * This file is the shell only: the drop target, the frame, and which of the two
 * panel states is showing. Everything with markup of its own lives beside it in
 * `../components`.
 */
export function DmgCompilerPage() {
  const [dragging, setDragging] = useState(false);
  const compiler = useDmgCompiler();
  const { app, progress, result, error, building, chooseApp, dropApp } = compiler;

  if (globalThis.lazify.platform !== "darwin") return <MacOnlyNotice />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
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
          "group relative overflow-hidden",
          "border rounded-[24px] bg-soft p-6 shadow-panel",
          "transition-[border-color,box-shadow] duration-300",
          dragging ? "border-accent shadow-accent-lg" : "border-border"
        )}
      >
        <CardShapes variant={app ? 1 : 0} className="opacity-[0.14] group-hover:opacity-25" />

        {/* Hairline along the top edge — what stops a large card reading as a
            slab. The only gradient here, and the same one the source-mode cards
            already use. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(to right, transparent, var(--color-accent), transparent)"
          }}
        />

        <AppHeader app={app} building={building} onChangeApp={() => void chooseApp()} />

        {app ? <AppStatusTiles sizeBytes={app.sizeBytes} /> : null}

        <div
          className={clsx(
            "relative mt-5",
            "border border-border/80 rounded-[20px] bg-bg/75",
            app ? "p-4" : "p-0"
          )}
        >
          {app ? (
            <BuildForm {...compiler} app={app} step={progress?.step ?? "staging"} />
          ) : (
            <AppPickerDropzone dragging={dragging} onChoose={() => void chooseApp()} />
          )}
        </div>
      </section>

      {/* A bundle that could not be read. Build failures live on `result`. */}
      {error ? <WarningNotice message={error} /> : null}

      {result ? <BuildOutcome result={result} /> : null}
    </div>
  );
}
