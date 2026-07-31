import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageCrumb } from "@renderer/app/components/PageChrome";
import { translation } from "@renderer/i18n/translation";
import {
  BodyText,
  CaptionText,
  CardTitle,
  MonoText,
  OverlineText,
  PillText,
  SmallText
} from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { useDmgCompiler } from "../hooks/use-dmg-compiler";

/**
 * DMG compiler: a built `.app` in, a disk image anyone can install from out.
 *
 * Built to the project's playful-doc-console direction — one framed surface with
 * clipped artwork, a header cluster, status tiles, and a panel holding the
 * interactive part. Neutral surfaces throughout; state is carried by a rail, an
 * icon chip and one pill rather than by washing anything in colour.
 *
 * The header shows the app's *own* icon once one is picked. That is the point of
 * the screen: the only real mistake it can make is packaging the wrong bundle,
 * and a generic placeholder makes every app look like every other app.
 */

/** Bytes as something readable. Disk images are megabytes; two units is plenty. */
function formatSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const megabytes = bytes / (1024 * 1024);

  return megabytes >= 1024
    ? `${(megabytes / 1024).toFixed(2)} GB`
    : `${megabytes.toFixed(1)} MB`;
}

/** One compact fact about the picked bundle. */
function StatusTile({
  icon,
  label,
  value,
  title,
  mono = true,
  delayMs
}: Readonly<{
  icon: UiIconName;
  label: string;
  value: string;
  title?: string;
  /** Sizes and formats are data; a description of the layout is not. */
  mono?: boolean;
  /** Staggers the reveal, so the row lands as a sequence rather than a block. */
  delayMs: number;
}>) {
  const { t } = useTranslation();

  return (
    <div
      title={title}
      style={{ animationDelay: `${delayMs}ms` }}
      className={clsx(
        "flex items-center gap-2.5 overflow-hidden",
        "border border-border rounded-[18px] bg-bg/75 px-3 py-2.5",
        "animate-fadeIn"
      )}
    >
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center",
          "border border-border rounded-xl bg-soft text-muted"
        )}
      >
        <UiIcon name={icon} className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0">
        <PillText as="span" className="block !text-muted">
          {t(label)}
        </PillText>
        {mono ? (
          <MonoText as="span" className="block truncate text-xs text-text">
            {value}
          </MonoText>
        ) : (
          <SmallText as="span" className="block truncate !text-text">
            {value}
          </SmallText>
        )}
      </span>
    </div>
  );
}

/** A labelled control in the panel, so both fields read as one group. */
function Field({
  icon,
  label,
  hint,
  children
}: Readonly<{
  icon: UiIconName;
  label: string;
  hint: string;
  children: React.ReactNode;
}>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <UiIcon name={icon} className="h-3 w-3 shrink-0 text-muted" />
        <PillText as="span" className="!text-muted">
          {t(label)}
        </PillText>
      </div>

      {children}

      <CaptionText tone="muted" className="leading-relaxed">
        {t(hint)}
      </CaptionText>
    </div>
  );
}

/** The three things this page does, drawn as the flow it is. */
function FlowHint() {
  const { t } = useTranslation();

  const steps = [
    { icon: "package", label: translation.DmgCompiler.FlowPick },
    { icon: "settings", label: translation.DmgCompiler.FlowName },
    { icon: "hard-drive", label: translation.DmgCompiler.FlowBuild }
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-1.5">
          <span
            className={clsx(
              "flex items-center gap-1.5",
              "border border-border rounded-full bg-soft px-2.5 py-1 text-muted"
            )}
          >
            <UiIcon name={step.icon} className="h-3 w-3" />
            <PillText as="span">{t(step.label)}</PillText>
          </span>

          {index < steps.length - 1 ? (
            <UiIcon name="arrow-right" className="h-3 w-3 shrink-0 text-muted/60" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function DmgCompilerPage() {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const {
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
    reset
  } = useDmgCompiler();

  // `hdiutil`, `ditto` and `sips` are macOS tools, and a `.app` only means
  // anything there. Rather than fail at the end of a build, the page says so.
  if (globalThis.lazify.platform !== "darwin") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <span
          className={clsx(
            "flex h-14 w-14 items-center justify-center",
            "border border-border rounded-[20px] bg-soft text-muted"
          )}
        >
          <UiIcon name="hard-drive" className="h-6 w-6" />
        </span>

        <OverlineText className="!text-muted">{t(translation.DmgCompiler.Eyebrow)}</OverlineText>
        <CardTitle>{t(translation.DmgCompiler.Title)}</CardTitle>
        <BodyText tone="muted" className="leading-relaxed">
          {t(translation.DmgCompiler.MacOnly)}
        </BodyText>
      </div>
    );
  }

  const step = progress?.step ?? "staging";

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

        {/* ── Header cluster ───────────────────────────────────────────── */}
        <header className="relative flex items-start gap-4">
          <span
            className={clsx(
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden",
              "border rounded-[20px]",
              // The chip changes shape *and* palette when an app lands — accent
              // placeholder to neutral icon frame — so the colours ease with the
              // rotation rather than cutting to the new state.
              "transition-[transform,border-color,background-color,color] duration-300",
              "group-hover:-rotate-2 group-hover:scale-[1.03]",
              app?.iconDataUrl
                ? "border-border bg-bg"
                : "border-accent/25 bg-accent/10 text-accent ring-1 ring-accent/20"
            )}
          >
            {app?.iconDataUrl ? (
              <img
                src={app.iconDataUrl}
                alt=""
                draggable={false}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <UiIcon name={app ? "package" : "hard-drive"} className="h-6 w-6" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <OverlineText className="text-[11px]">
              {t(translation.DmgCompiler.Eyebrow)}
            </OverlineText>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">
                {app ? app.name : t(translation.DmgCompiler.Title)}
              </CardTitle>

              {app?.version ? (
                <PillText
                  as="span"
                  className="border border-accent/20 rounded-full bg-accent/10 px-2 py-0.5 !text-accent"
                >
                  {app.version}
                </PillText>
              ) : null}
            </div>

            {app ? (
              <CaptionText tone="muted" className="mt-1 block truncate" title={app.appPath}>
                {app.appPath}
              </CaptionText>
            ) : (
              <BodyText tone="muted" className="mt-1.5 leading-relaxed">
                {t(translation.DmgCompiler.Description)}
              </BodyText>
            )}
          </div>

          {app ? (
            <LabelButton
              label={translation.DmgCompiler.ChangeApp}
              onClick={() => void chooseApp()}
              disabled={building}
              className="shrink-0"
            />
          ) : null}
        </header>

        {/* ── Status tiles ─────────────────────────────────────────────── */}
        {/* About the image that will come out, not the app that went in — the
            header already identifies the app three ways over, and what the user
            cannot see anywhere else is what they are about to produce. */}
        {app ? (
          <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
            <StatusTile
              icon="package"
              label={translation.DmgCompiler.TileSize}
              value={formatSize(app.sizeBytes)}
              delayMs={0}
            />
            <StatusTile
              icon="hard-drive"
              label={translation.DmgCompiler.TileFormat}
              value="UDZO · HFS+"
              delayMs={60}
            />
            <StatusTile
              icon="folder"
              label={translation.DmgCompiler.TileLayout}
              value={t(translation.DmgCompiler.LayoutValue)}
              mono={false}
              delayMs={120}
            />
          </div>
        ) : null}

        {/* ── The interactive panel ────────────────────────────────────── */}
        <div
          className={clsx(
            "relative mt-5",
            "border border-border/80 rounded-[20px] bg-bg/75",
            app ? "p-4" : "p-0"
          )}
        >
          {app ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  icon="settings"
                  label={translation.DmgCompiler.VolumeName}
                  hint={translation.DmgCompiler.VolumeNameHint}
                >
                  <TextInput
                    size="sm"
                    value={volumeName}
                    disabled={building}
                    onChange={(event) => setVolumeName(event.target.value)}
                    placeholder={app.name}
                    aria-label={t(translation.DmgCompiler.VolumeName)}
                  />
                </Field>

                <Field
                  icon="folder"
                  label={translation.DmgCompiler.Destination}
                  hint={translation.DmgCompiler.DestinationHint}
                >
                  {/* The whole row opens the save dialog: the path is the
                      control, so making it the target beats parking a button
                      beside something that looks clickable already. */}
                  <Tooltip content={outputPath} side="top">
                    <button
                      type="button"
                      onClick={() => void chooseDestination()}
                      disabled={building}
                      className={clsx(
                        "flex min-h-[34px] w-full items-center gap-2",
                        "border border-border rounded-md bg-bg px-2 py-1",
                        // Only the fade eases. The hover tint is deliberately
                        // instant: this row is a control, and a colour crawling in
                        // behind the pointer reads as lag rather than as polish.
                        "text-left transition-[opacity] duration-200",
                        building
                          ? "cursor-not-allowed opacity-60"
                          : "hover:border-accent/40 hover:bg-accent/[0.04]"
                      )}
                    >
                      <MonoText as="span" className="min-w-0 flex-1 truncate text-[11px] text-text">
                        {outputPath}
                      </MonoText>
                      <UiIcon name="folder-plus" className="h-3.5 w-3.5 shrink-0 text-muted" />
                    </button>
                  </Tooltip>
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                <LabelButton
                  label={translation.DmgCompiler.Build}
                  icon="hard-drive"
                  variant="accent"
                  loading={building}
                  disabled={building || !outputPath}
                  onClick={() => void build()}
                />

                {!building && (result || error) ? (
                  <LabelButton label={translation.DmgCompiler.StartOver} onClick={reset} />
                ) : null}

                {!building && !result ? (
                  <CaptionText tone="muted" className="ml-auto">
                    {t(translation.DmgCompiler.DropHintShort)}
                  </CaptionText>
                ) : null}
              </div>

              {/* Two real steps, each named while it runs, with the pair drawn
                  as a track. No percentage: `hdiutil` reports none, and one
                  that jumps from 40% to done is worse than not claiming to
                  know. */}
              {building ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <UiIcon
                      name="refresh-circle"
                      className="h-3.5 w-3.5 animate-spin text-accent"
                    />
                    <SmallText className="!text-text">
                      {t(
                        step === "compressing"
                          ? translation.DmgCompiler.StepCompressing
                          : translation.DmgCompiler.StepStaging
                      )}
                    </SmallText>
                  </div>

                  <div className="flex gap-1.5" aria-hidden>
                    {(["staging", "compressing"] as const).map((segment) => {
                      const active = segment === step;
                      const passed = segment === "staging" && step === "compressing";

                      return (
                        <span
                          key={segment}
                          className={clsx(
                            "h-1 flex-1 rounded-full",
                            passed && "bg-accent",
                            active && "bg-accent animate-pulseLine",
                            !passed && !active && "bg-border"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Nothing picked yet: the panel is one large tactile target. */
            <button
              type="button"
              onClick={() => void chooseApp()}
              className={clsx(
                "flex w-full flex-col items-center gap-3",
                "rounded-[20px] px-6 py-12 text-center",
                "transition-[transform,background-color] duration-300",
                dragging ? "bg-accent/[0.05]" : "hover:-translate-y-1 hover:bg-accent/[0.03]"
              )}
            >
              <span
                className={clsx(
                  "flex h-16 w-16 items-center justify-center",
                  "border rounded-[22px]",
                  // Colours belong in the list: this chip goes muted → accent on
                  // hover and on drag-over, and leaving `color` and
                  // `background-color` out made the one moment the page is meant
                  // to feel responsive snap instead of ease.
                  "transition-[transform,box-shadow,border-color,background-color,color]",
                  "duration-300",
                  dragging
                    ? "scale-105 border-accent/40 bg-accent/10 text-accent shadow-accent-icon"
                    : "border-border bg-soft text-muted group-hover:-rotate-3 group-hover:scale-105 group-hover:border-accent/20 group-hover:text-accent"
                )}
              >
                <UiIcon name={dragging ? "package" : "hard-drive"} className="h-7 w-7" />
              </span>

              <CardTitle className="text-xl">
                {t(dragging ? translation.DmgCompiler.DropNow : translation.DmgCompiler.ChooseApp)}
              </CardTitle>

              <BodyText tone="muted" className="max-w-sm leading-relaxed">
                {t(translation.DmgCompiler.ChooseAppHint)}
              </BodyText>

              <div className="mt-2">
                <FlowHint />
              </div>
            </button>
          )}
        </div>
      </section>

      {/* ── A bundle that could not be read ──────────────────────────────── */}
      {error ? (
        <div
          className={clsx(
            "flex items-start gap-3",
            "border border-warning/30 rounded-2xl bg-warning/[0.06] px-4 py-3",
            "animate-fadeIn"
          )}
        >
          <UiIcon name="warning-triangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <SmallText className="!text-warning">{error}</SmallText>
        </div>
      ) : null}

      {/* ── Outcome ──────────────────────────────────────────────────────── */}
      {result?.success ? (
        <section
          className={clsx(
            "relative flex items-center gap-4 overflow-hidden",
            "border border-border rounded-[20px] bg-soft px-4 py-3.5 shadow-panel",
            "animate-fadeIn"
          )}
        >
          {/* Rail rather than a green wash: the surface stays neutral and the
              state is readable down the left edge, as on the tool cards. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-success"
          />

          <span
            className={clsx(
              "flex h-11 w-11 shrink-0 items-center justify-center",
              "border border-success/25 rounded-2xl bg-success/10 text-success"
            )}
          >
            <UiIcon name="check-circle" className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <BodyText className="!text-text">{t(translation.DmgCompiler.BuiltTitle)}</BodyText>
              <PillText
                as="span"
                className="border border-border rounded-full bg-bg px-2 py-0.5 !text-muted"
              >
                {formatSize(result.sizeBytes)}
              </PillText>
            </div>

            <MonoText
              as="span"
              title={result.outputPath}
              className="mt-0.5 block truncate text-[11px] text-muted"
            >
              {result.outputPath}
            </MonoText>
          </div>

          <LabelButton
            label={translation.DmgCompiler.RevealDmg}
            icon="folder"
            variant="success"
            onClick={() => void globalThis.lazify.revealInFileManager(result.outputPath)}
          />
        </section>
      ) : null}

      {result && !result.success ? (
        <section
          className={clsx(
            "relative flex items-start gap-4 overflow-hidden",
            "border border-border rounded-[20px] bg-soft px-4 py-3.5 shadow-panel",
            "animate-fadeIn"
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-error"
          />

          <span
            className={clsx(
              "flex h-11 w-11 shrink-0 items-center justify-center",
              "border border-error/25 rounded-2xl bg-error/10 text-error"
            )}
          >
            <UiIcon name="warning-triangle" className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <BodyText className="!text-text">{t(translation.DmgCompiler.FailedTitle)}</BodyText>

            {/* The tool's own words: `hdiutil` failures are specific, and
                paraphrasing them would only hide which one happened. */}
            <MonoText
              as="pre"
              className={clsx(
                "mt-2 max-h-40 overflow-auto",
                "border border-border rounded-lg bg-bg px-2.5 py-2",
                "text-[11px] leading-relaxed text-muted whitespace-pre-wrap"
              )}
            >
              {result.message}
            </MonoText>
          </div>
        </section>
      ) : null}
    </div>
  );
}
