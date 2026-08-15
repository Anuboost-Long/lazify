import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { EnvVariable } from "@renderer/shared/types/lazify";
import { CaptionText, MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { useProjectEnv } from "../hooks/use-project-env";
import { EnvAddForm } from "./EnvAddForm";
import { EnvFileTabs } from "./EnvFileTabs";
import { EnvVariableGroup } from "./EnvVariableGroup";
import { EnvVariableRow } from "./EnvVariableRow";

interface EnvPaneProps {
  projectPath: string | null;
  /** False while the panel is mounted but closed, which holds off the read. */
  active?: boolean;
}

/**
 * Every variable in a project's .env files, and the controls to change them.
 *
 * The body only — the rail panel and the workbench sheet each supply their own
 * header, so this renders the same in a 288px rail as it does full width.
 */
export function EnvPane({ projectPath, active = true }: Readonly<EnvPaneProps>) {
  const { t } = useTranslation();
  const env = useProjectEnv(projectPath, active);

  const [revealed, setRevealed] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const variables = env.file?.variables ?? [];
  const enabled = variables.filter((variable) => variable.enabled);
  const disabled = variables.filter((variable) => !variable.enabled);

  // Every mutation is a write to a file the user cannot afford to have raced,
  // so the rows lock for the round-trip rather than queue up edits.
  const run = async (work: () => Promise<boolean>) => {
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  };

  const renderVariable = (variable: EnvVariable) => (
    <EnvVariableRow
      key={`${variable.line}-${variable.key}`}
      variable={variable}
      revealed={revealed}
      busy={busy}
      onToggle={(next) => void run(() => env.update(variable.line, variable.key, { enabled: next }))}
      onSave={(key, value) => void run(() => env.update(variable.line, variable.key, { key, value }))}
      onDelete={() => void run(() => env.remove(variable.line, variable.key))}
    />
  );

  if (!projectPath) {
    return (
      <SmallText className="!text-muted block px-3 py-3">{t(translation.EnvPane.NoProject)}</SmallText>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EnvFileTabs files={env.files} selected={env.selected} onSelect={env.select} />

      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        {env.selected ? (
          <>
            <MonoText
              as="span"
              className="!text-text shrink-0 rounded bg-text/[0.06] px-1.5 py-px text-[11px]"
            >
              {env.selected}
            </MonoText>

            <CaptionText tone="muted" className="min-w-0 flex-1 truncate">
              {disabled.length > 0
                ? t(translation.EnvPane.SummaryWithDisabled, {
                    count: enabled.length,
                    disabled: disabled.length
                  })
                : t(translation.EnvPane.Summary, { count: enabled.length })}
            </CaptionText>

            <IconButton
              icon={revealed ? "shield-check" : "shield-off"}
              title={revealed ? t(translation.EnvPane.HideValues) : t(translation.EnvPane.ShowValues)}
              aria-label={revealed ? t(translation.EnvPane.HideValues) : t(translation.EnvPane.ShowValues)}
              onClick={() => setRevealed((current) => !current)}
            />
            <IconButton
              icon="refresh-circle"
              title={t(translation.GlobalTerm.Refresh)}
              aria-label={t(translation.GlobalTerm.Refresh)}
              iconClassName={env.loading ? "animate-spin" : undefined}
              onClick={() => void env.refresh()}
            />
            <IconButton
              icon="plus"
              title={t(translation.EnvPane.AddVariable)}
              aria-label={t(translation.EnvPane.AddVariable)}
              onClick={() => setAdding(true)}
              className="text-accent"
            />
          </>
        ) : (
          <SmallText as="span" className="!text-muted truncate">
            {t(translation.EnvPane.NoFiles)}
          </SmallText>
        )}
      </div>

      {env.error ? (
        <CaptionText className="block border-b border-border bg-rose-500/[0.06] px-3 py-1.5 !text-rose-600 dark:!text-rose-400">
          {env.error}
        </CaptionText>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {adding && env.selected ? (
          <div className="mb-2">
            <EnvAddForm
              existingKeys={variables.map((variable) => variable.key)}
              busy={busy}
              onAdd={(key, value) => run(() => env.add(key, value))}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : null}

        {env.files.length === 0 && !env.loading ? (
          <div className="px-1 py-2">
            <SmallText className="!text-muted block">{t(translation.EnvPane.NoFiles)}</SmallText>
            <button
              type="button"
              onClick={() => void env.create(".env")}
              className="mt-2 rounded-md bg-accent/10 px-2 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
            >
              {t(translation.EnvPane.CreateFile)}
            </button>
          </div>
        ) : null}

        {env.selected && variables.length === 0 && !env.loading ? (
          <SmallText className="!text-muted block px-1 py-2">{t(translation.EnvPane.Empty)}</SmallText>
        ) : null}

        {enabled.length > 0 ? (
          <EnvVariableGroup label={t(translation.EnvPane.GroupActive)} count={enabled.length}>
            {enabled.map(renderVariable)}
          </EnvVariableGroup>
        ) : null}

        {disabled.length > 0 ? (
          <EnvVariableGroup label={t(translation.EnvPane.GroupDisabled)} count={disabled.length} muted>
            {disabled.map(renderVariable)}
          </EnvVariableGroup>
        ) : null}
      </div>
    </div>
  );
}
