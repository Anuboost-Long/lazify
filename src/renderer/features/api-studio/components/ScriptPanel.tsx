import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import { useScriptSuggestions } from "../hooks/use-script-suggestions";
import type { ScriptPhase, SuggestionSource } from "../script-api";
import { ScriptSuggestionList } from "./ScriptSuggestionList";

interface ScriptPanelProps {
  value: string;
  hint: string;
  label: string;
  phase: ScriptPhase;
  globalName: string;
  known: SuggestionSource;
  onChange: (text: string) => void;
  onOpenReference: () => void;
}

export function ScriptPanel({
  value,
  hint,
  label,
  phase,
  globalName,
  known,
  onChange,
  onOpenReference
}: Readonly<ScriptPanelProps>) {
  const { t } = useTranslation();
  const suggestions = useScriptSuggestions(globalName, phase, known, onChange);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const measure = () =>
      setFrame({ width: element.clientWidth, height: element.clientHeight });

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs leading-5 text-muted">{hint}</p>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenReference}
            className="text-[11px] font-medium text-accent transition-colors hover:underline"
          >
            {t(translation.ApiStudio.HowScriptsWork)}
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={!value.trim()}
            className={clsx(
              "text-[11px] font-medium text-muted transition-colors hover:text-text",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
            )}
          >
            {t(translation.ApiStudio.ClearScript)}
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative h-[280px] overflow-hidden rounded-lg border border-border bg-bg/45"
      >
        <CodeSurface
          variant="flush"
          wrap
          editable
          content={value}
          fileName="script.js"
          label={label}
          placeholder={t(translation.ApiStudio.ScriptPlaceholder, { global: globalName })}
          onContentChange={(text) => {
            onChange(text);
            suggestions.follow();
          }}
          inputRef={suggestions.input}
          onKeyDown={suggestions.onKeyDown}
          className="h-full"
        />

        <ScriptSuggestionList
          items={suggestions.items}
          caret={suggestions.caret}
          frame={frame}
          highlighted={suggestions.highlighted}
          onPick={suggestions.apply}
          onHighlight={suggestions.highlight}
        />
      </div>
    </div>
  );
}
