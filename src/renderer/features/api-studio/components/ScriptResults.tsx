import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ScriptRun } from "../types";

interface ScriptResultsProps {
  pre: ScriptRun | null;
  post: ScriptRun | null;
}

interface PhaseRun {
  phase: string;
  run: ScriptRun;
}

function isSilent(run: ScriptRun | null) {
  return !run || (run.checks.length === 0 && run.logs.length === 0 && !run.error);
}

function phaseRuns(pre: ScriptRun | null, post: ScriptRun | null): PhaseRun[] {
  return [
    { phase: "pre", run: pre },
    { phase: "post", run: post }
  ].filter((entry): entry is PhaseRun => !isSilent(entry.run));
}

export function ScriptResults({ pre, post }: Readonly<ScriptResultsProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const runs = phaseRuns(pre, post);

  if (runs.length === 0) return null;

  const checks = runs.flatMap(({ phase, run }) =>
    run.checks.map((check, index) => ({ ...check, key: `${phase}-${index}` }))
  );
  const failed = checks.filter((check) => !check.passed).length;
  const errors = runs.filter(({ run }) => run.error);
  const logs = runs.flatMap(({ run }) => run.logs);

  return (
    <section className="shrink-0 border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex w-full items-center gap-2 px-4 py-2 text-left transition-colors",
          "hover:bg-text/[0.03]"
        )}
      >
        <span className="text-[11px] font-medium text-text">
          {t(translation.ApiStudio.ScriptResults)}
        </span>

        {checks.length > 0 ? (
          <span
            className={clsx(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              failed > 0 ? "bg-error/10 text-error" : "bg-success/10 text-success"
            )}
          >
            {failed > 0
              ? t(translation.ApiStudio.ChecksFailed, { failed, total: checks.length })
              : t(translation.ApiStudio.ChecksPassed, { total: checks.length })}
          </span>
        ) : null}

        {errors.length > 0 ? (
          <span className="rounded-md bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error">
            {t(translation.ApiStudio.ScriptFailed)}
          </span>
        ) : null}

        <span className="ml-auto text-[10px] text-muted">
          {t(open ? translation.ApiStudio.HideScriptOutput : translation.ApiStudio.ShowScriptOutput)}
        </span>
      </button>

      {open ? (
        <div className="flex max-h-40 flex-col gap-2 overflow-y-auto px-4 pb-3">
          {errors.map(({ phase, run }) => (
            <p key={phase} className="font-mono text-[11px] leading-5 text-error">
              {run.error}
            </p>
          ))}

          {checks.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {checks.map((check) => (
                <li key={check.key} className="flex items-baseline gap-2 py-1.5">
                  <span
                    className={clsx(
                      "font-mono text-[10px] font-semibold",
                      check.passed ? "text-success" : "text-error"
                    )}
                  >
                    {t(
                      check.passed
                        ? translation.ApiStudio.CheckPassed
                        : translation.ApiStudio.CheckFailed
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-[11px] text-text">{check.name}</span>
                  {check.detail ? (
                    <span className="min-w-0 flex-1 break-words font-mono text-[10px] text-muted">
                      {check.detail}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {logs.length > 0 ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-muted">
              {logs.join("\n")}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
