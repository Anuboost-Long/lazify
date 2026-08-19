import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ScriptEditor } from "../hooks/use-request-draft";
import { isPostmanDialect, type ScriptPhase, type SuggestionSource } from "../script-api";
import { looksPostman, POSTMAN_GLOBAL } from "@main/api-studio/scripting/postman-map";
import { PostmanDialectNotice } from "./PostmanDialectNotice";
import { ScriptPanel } from "./ScriptPanel";
import { ScriptReferenceModal } from "./ScriptReferenceModal";

interface ScriptsPanelProps {
  scripts: ScriptEditor;
  globalName: string;
  known: SuggestionSource;
  onGlobalNameChange: (name: string) => void;
}

const LABEL: Record<ScriptPhase, string> = {
  pre: translation.ApiStudio.PreRequest,
  post: translation.ApiStudio.PostResponse
};

const HINT: Record<ScriptPhase, string> = {
  pre: translation.ApiStudio.PreRequestHint,
  post: translation.ApiStudio.PostResponseHint
};

export function ScriptsPanel({
  scripts,
  globalName,
  known,
  onGlobalNameChange
}: Readonly<ScriptsPanelProps>) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<ScriptPhase>("pre");
  const [reading, setReading] = useState(false);
  const [ignoredPostman, setIgnoredPostman] = useState(false);
  const written: Record<ScriptPhase, boolean> = {
    pre: Boolean(scripts.pre.trim()),
    post: Boolean(scripts.post.trim())
  };

  const write = (target: ScriptPhase, text: string) =>
    target === "pre" ? scripts.setPre(text) : scripts.setPost(text);

  const insert = (target: ScriptPhase, code: string) => {
    const current = target === "pre" ? scripts.pre : scripts.post;

    write(target, current.trim() ? `${current.replace(/\n+$/, "")}\n${code}\n` : `${code}\n`);
    setPhase(target);
    setReading(false);
  };

  const pasted =
    !ignoredPostman &&
    !isPostmanDialect(globalName) &&
    (looksPostman(scripts.pre) || looksPostman(scripts.post));

  return (
    <div className="flex flex-col gap-3">
      {pasted ? (
        <PostmanDialectNotice
          globalName={globalName}
          onSwitch={() => onGlobalNameChange(POSTMAN_GLOBAL)}
          onDismiss={() => setIgnoredPostman(true)}
        />
      ) : null}

      <div className="flex items-center gap-1">
        {(["pre", "post"] as ScriptPhase[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPhase(option)}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
              "transition-colors",
              phase === option ? "bg-text/[0.06] text-text" : "text-muted hover:text-text"
            )}
          >
            {t(LABEL[option])}
            {written[option] ? (
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            ) : null}
          </button>
        ))}
      </div>

      <ScriptPanel
        key={phase}
        value={phase === "pre" ? scripts.pre : scripts.post}
        hint={t(HINT[phase])}
        label={t(LABEL[phase])}
        phase={phase}
        globalName={globalName}
        known={known}
        onChange={(text) => write(phase, text)}
        onOpenReference={() => setReading(true)}
      />

      <ScriptReferenceModal
        open={reading}
        phase={phase}
        globalName={globalName}
        onGlobalNameChange={onGlobalNameChange}
        onInsert={insert}
        onClose={() => setReading(false)}
      />
    </div>
  );
}
