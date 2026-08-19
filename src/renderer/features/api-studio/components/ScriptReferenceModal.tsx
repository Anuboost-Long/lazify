import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { isUsableGlobal } from "@main/api-studio/scripting/global-name";
import { translation } from "@renderer/i18n/translation";
import { SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { isPostmanDialect, jsGlobalNames, RECIPES, type ScriptPhase } from "../script-api";
import { ScriptApiList } from "./ScriptApiList";

interface ScriptReferenceModalProps {
  open: boolean;
  phase: ScriptPhase;
  globalName: string;
  onGlobalNameChange: (name: string) => void;
  onInsert: (phase: ScriptPhase, code: string) => void;
  onClose: () => void;
}

const PHASE_LABEL: Record<ScriptPhase, string> = {
  pre: translation.ApiStudio.PreRequest,
  post: translation.ApiStudio.PostResponse
};

const PHASE_HINT: Record<ScriptPhase, string> = {
  pre: translation.ApiStudio.PreRequestHint,
  post: translation.ApiStudio.PostResponseHint
};

export function ScriptReferenceModal(props: Readonly<ScriptReferenceModalProps>) {
  return (
    <BaseModal open={props.open} onClose={props.onClose}>
      {props.open ? <ReferenceCard {...props} /> : null}
    </BaseModal>
  );
}

function ReferenceCard({
  phase,
  globalName,
  onGlobalNameChange,
  onInsert,
  onClose
}: Readonly<ScriptReferenceModalProps>) {
  const { t } = useTranslation();
  const [shown, setShown] = useState<ScriptPhase>(phase);
  const [name, setName] = useState(globalName);
  const usable = isUsableGlobal(name);

  const rename = (next: string) => {
    setName(next);
    if (isUsableGlobal(next)) onGlobalNameChange(next);
  };

  return (
    <div
      className={clsx(
        "flex max-h-[80vh] w-[min(640px,92vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>{t(translation.ApiStudio.HowScriptsWork)}</SectionTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.ApiStudio.Close)}
            className="text-muted transition-colors hover:text-text"
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {(["pre", "post"] as ScriptPhase[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setShown(option)}
              className={clsx(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                shown === option ? "bg-text/[0.06] text-text" : "text-muted hover:text-text"
              )}
            >
              {t(PHASE_LABEL[option])}
            </button>
          ))}
        </div>

        <p className="text-xs leading-5 text-muted">{t(PHASE_HINT[shown])}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-4">
        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-text">
            {t(translation.ApiStudio.ScriptGlobalName)}
          </span>
          <input
            value={name}
            spellCheck={false}
            onChange={(event) => rename(event.target.value)}
            className={clsx(
              "h-9 w-40 rounded-lg border bg-bg/45 px-3 font-mono text-xs text-text outline-none",
              usable ? "border-border focus:border-accent/50" : "border-warning/45"
            )}
          />
          <p className="text-[11px] leading-5 text-muted">
            {usable
              ? t(translation.ApiStudio.ScriptGlobalNameDesc)
              : t(translation.ApiStudio.ScriptGlobalNameInvalid)}
          </p>
          {usable && isPostmanDialect(name) ? (
            <p className="text-[11px] leading-5 text-accent">
              {t(translation.ApiStudio.PostmanDialectNote)}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-text">
            {t(translation.ApiStudio.WhatYouCanWrite)}
          </span>
          <ScriptApiList phase={shown} globalName={usable ? name : "lz"} />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-text">
            {t(translation.ApiStudio.JavascriptOnHand)}
          </span>
          <p className="text-[11px] leading-5 text-muted">
            {t(translation.ApiStudio.JavascriptOnHandDesc)}
          </p>
          <p className="font-mono text-[11px] leading-6 text-muted">{jsGlobalNames().join(" · ")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-text">
            {t(translation.ApiStudio.ScriptRecipes)}
          </span>
          <ul className="flex flex-col divide-y divide-border">
            {RECIPES.filter((recipe) => recipe.phase === shown).map((recipe) => (
              <li key={recipe.title} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-text">{recipe.title}</span>
                  <button
                    type="button"
                    onClick={() => onInsert(recipe.phase, recipe.code(usable ? name : "lz"))}
                    className="shrink-0 text-[11px] font-medium text-accent transition-colors hover:underline"
                  >
                    {t(translation.ApiStudio.InsertRecipe)}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border bg-bg/45 px-3 py-2 font-mono text-[11px] leading-5 text-muted">
                  {recipe.code(usable ? name : "lz")}
                </pre>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-text">
            {t(translation.ApiStudio.ScriptLimits)}
          </span>
          <p className="text-[11px] leading-5 text-muted">
            {t(translation.ApiStudio.ScriptLimitsDesc)}
          </p>
        </section>
      </div>
    </div>
  );
}
