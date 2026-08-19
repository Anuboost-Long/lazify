import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ApiVariable } from "../types";

interface VariableRowProps {
  variable: ApiVariable;
  value: string;
  onChange: (value: string) => void;
  onRemove: (() => void) | null;
}

export function VariableRow({ variable, value, onChange, onRemove }: Readonly<VariableRowProps>) {
  const { t } = useTranslation();
  const missing = !value.trim() && !variable.defaultValue;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-text">{variable.name}</span>
        {variable.parameterName ? (
          <span className="rounded-md bg-text/[0.06] px-1.5 py-0.5 text-[10px] text-muted">
            {variable.location} · {variable.parameterName}
          </span>
        ) : null}
        {variable.secret ? (
          <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
            {t(translation.ApiStudio.SecretValue)}
          </span>
        ) : null}
        {variable.custom ? (
          <span className="text-[10px] text-muted">{t(translation.ApiStudio.AddedByYou)}</span>
        ) : (
          <span className="text-[10px] text-muted">
            {variable.routeCount} {t(translation.ApiStudio.UsedByRoutes)}
          </span>
        )}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            title={t(translation.ApiStudio.RemoveVariable)}
            aria-label={`${t(translation.ApiStudio.RemoveVariable)} ${variable.name}`}
            className="ml-auto text-muted transition-colors hover:text-text"
          >
            <UiIcon name="xmark" className="h-3 w-3" />
          </button>
        ) : null}
      </span>

      <input
        type={variable.secret ? "password" : "text"}
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={variable.defaultValue ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "h-9 w-full rounded-lg border bg-bg/45 px-3 font-mono text-xs text-text",
          "outline-none placeholder:text-muted/70 focus:border-accent/50",
          missing ? "border-warning/45" : "border-border"
        )}
      />

      {variable.defaultValue && !value.trim() ? (
        <span className="text-[10px] text-muted">{t(translation.ApiStudio.DetectedDefault)}</span>
      ) : null}
    </label>
  );
}
