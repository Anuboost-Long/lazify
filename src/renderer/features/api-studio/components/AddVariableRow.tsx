import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { CustomVariable } from "../types";

type VariableLocation = CustomVariable["location"];

interface AddVariableRowProps {
  onAdd: (parameterName: string, location: VariableLocation, secret: boolean) => void;
}

const LOCATIONS: Array<{ id: VariableLocation; label: string }> = [
  { id: "header", label: translation.ApiStudio.LocationHeader },
  { id: "query", label: translation.ApiStudio.LocationQuery },
  { id: "cookie", label: translation.ApiStudio.LocationCookie }
];

export function AddVariableRow({ onAdd }: Readonly<AddVariableRowProps>) {
  const { t } = useTranslation();
  const [parameterName, setParameterName] = useState("");
  const [location, setLocation] = useState<VariableLocation>("header");
  const [secret, setSecret] = useState(true);

  const add = () => {
    if (!parameterName.trim()) return;

    onAdd(parameterName.trim(), location, secret);
    setParameterName("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={location}
          aria-label={t(translation.ApiStudio.VariableWhere)}
          onChange={(event) => setLocation(event.target.value as VariableLocation)}
          className={clsx(
            "h-8 rounded-lg border border-border bg-bg/45 px-2 text-xs text-text",
            "outline-none focus:border-accent/50"
          )}
        >
          {LOCATIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {t(option.label)}
            </option>
          ))}
        </select>

        <input
          value={parameterName}
          spellCheck={false}
          autoComplete="off"
          aria-label={t(translation.ApiStudio.VariableParameter)}
          placeholder={t(translation.ApiStudio.VariableParameter)}
          onChange={(event) => setParameterName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && add()}
          className={clsx(
            "h-8 min-w-0 flex-1 rounded-lg border border-border bg-bg/45 px-2.5",
            "font-mono text-xs text-text outline-none placeholder:text-muted/70",
            "focus:border-accent/50"
          )}
        />

        <button
          type="button"
          aria-pressed={secret}
          onClick={() => setSecret(!secret)}
          className={clsx(
            "h-8 rounded-lg border px-2.5 text-[11px] font-medium transition-colors",
            secret
              ? "border-warning/45 bg-warning/10 text-warning"
              : "border-border text-muted hover:text-text"
          )}
        >
          {t(translation.ApiStudio.SecretValue)}
        </button>

        <button
          type="button"
          onClick={add}
          disabled={!parameterName.trim()}
          className={clsx(
            "flex h-8 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-xs font-semibold text-bg",
            "transition-colors hover:bg-accentHover",
            "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-accent"
          )}
        >
          <UiIcon name="plus" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.AddVariable)}
        </button>
      </div>

      <p className="text-[11px] leading-4 text-muted">
        {t(translation.ApiStudio.AddVariableHint)}
      </p>
    </div>
  );
}
