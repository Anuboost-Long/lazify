import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PromptPreset } from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText, SectionTitle, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { usePromptPresets } from "../hooks/use-prompt-presets";
import { fieldBase } from "./form-fields";

/** What a template may ask for. Shown so nobody has to guess the spelling. */
const VARIABLES = [
  "{{project_name}}",
  "{{task_name}}",
  "{{task_description}}",
  "{{task_requirements}}",
  "{{task_notes}}",
  "{{project_context}}",
  "{{project_rules}}",
  "{{global_rules}}"
];

const EMPTY_FORM = { name: "", description: "", template: "" };

export function PresetManagerPanel() {
  const { t } = useTranslation();
  const { presets, create, update, remove } = usePromptPresets();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // What "New preset" is for: until it is pressed, or a preset is picked, the
  // pane has nothing to edit and says so rather than showing a blank form.
  const [writingNew, setWritingNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const selected = presets.find((preset) => preset.id === selectedId) ?? null;
  const readOnly = selected?.isBuiltin ?? false;

  const startNew = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setWritingNew(true);
  };

  const clearEditor = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setWritingNew(false);
  };

  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name,
      description: selected.description,
      template: selected.template
    });
  }, [selected]);

  const duplicate = async (preset: PromptPreset) => {
    const created = await create({
      name: `${preset.name} (copy)`,
      description: preset.description,
      template: preset.template
    });
    setSelectedId(created.id);
    setWritingNew(false);
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-border">
        <header className="border-b border-border px-5 py-4">
          <SectionTitle>{t(translation.PromptBuilder.ManagePresets)}</SectionTitle>
          <CaptionText tone="muted" className="mt-1 block leading-5">
            {t(translation.PromptBuilder.PresetsHint)}
          </CaptionText>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelectedId(preset.id);
                setWritingNew(false);
              }}
              className={clsx(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left",
                preset.id === selectedId ? "bg-accent/10" : "hover:bg-text/[0.04]"
              )}
            >
              <SmallText
                className={clsx("min-w-0 truncate", preset.id === selectedId && "!text-accent")}
              >
                {preset.name}
              </SmallText>

              {preset.isBuiltin ? (
                <CaptionText
                  tone="muted"
                  className="shrink-0 rounded-full border border-border px-2 py-0.5"
                >
                  {t(translation.PromptBuilder.BuiltIn)}
                </CaptionText>
              ) : null}
            </button>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={startNew}
            className={clsx(
              "flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5",
              writingNew
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border text-muted hover:border-accent/40 hover:text-accent"
            )}
          >
            <UiIcon name="plus" className="h-3.5 w-3.5" />
            <SmallText>{t(translation.PromptBuilder.NewPreset)}</SmallText>
          </button>
        </div>
      </aside>

      {!selected && !writingNew ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6">
          <UiIcon name="journal-page" className="h-6 w-6 text-muted/40" />
          <SmallText tone="muted">{t(translation.PromptBuilder.NoPresetSelected)}</SmallText>
          <CaptionText tone="muted" className="max-w-sm text-center leading-5">
            {t(translation.PromptBuilder.NoPresetSelectedHint)}
          </CaptionText>
        </div>
      ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <OverlineText tone="muted">{t(translation.PromptBuilder.PresetName)}</OverlineText>
            <input
              value={form.name}
              readOnly={readOnly}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder={t(translation.PromptBuilder.PresetNamePlaceholder)}
              className={fieldBase}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <OverlineText tone="muted">
              {t(translation.PromptBuilder.PresetDescription)}
            </OverlineText>
            <input
              value={form.description}
              readOnly={readOnly}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder={t(translation.PromptBuilder.PresetDescriptionPlaceholder)}
              className={fieldBase}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <OverlineText tone="muted">{t(translation.PromptBuilder.Template)}</OverlineText>
          <textarea
            value={form.template}
            readOnly={readOnly}
            onChange={(event) => setForm({ ...form, template: event.target.value })}
            spellCheck={false}
            placeholder={t(translation.PromptBuilder.PresetTemplatePlaceholder)}
            className={clsx(fieldBase, "min-h-0 flex-1 resize-none font-mono leading-6")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <OverlineText tone="muted">{t(translation.PromptBuilder.Variables)}</OverlineText>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((variable) => (
              <button
                key={variable}
                type="button"
                disabled={readOnly}
                onClick={() => setForm({ ...form, template: `${form.template}${variable}` })}
                className={clsx(
                  "rounded-lg border border-border px-2.5 py-1 font-mono text-[11px] text-muted",
                  "enabled:hover:border-accent/40 enabled:hover:text-accent",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {variable}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <CaptionText tone="muted">
            {readOnly ? t(translation.PromptBuilder.BuiltInReadOnly) : ""}
          </CaptionText>

          <div className="flex items-center gap-2">
            {selected ? (
              <button
                type="button"
                onClick={() => void duplicate(selected)}
                className="rounded-full border border-border px-4 py-2 text-[12px] text-text hover:border-accent/40"
              >
                {t(translation.PromptBuilder.Duplicate)}
              </button>
            ) : null}

            {selected && !readOnly ? (
              <button
                type="button"
                onClick={() => {
                  void remove(selected.id);
                  clearEditor();
                }}
                className="rounded-full border border-error/30 px-4 py-2 text-[12px] text-error hover:bg-error/10"
              >
                {t(translation.GlobalTerm.Delete)}
              </button>
            ) : null}

            {writingNew ? (
              <button
                type="button"
                onClick={clearEditor}
                className="rounded-full px-4 py-2 text-[12px] text-muted hover:text-text"
              >
                {t(translation.GlobalTerm.Cancel)}
              </button>
            ) : null}

            <button
              type="button"
              disabled={readOnly || !form.name.trim() || !form.template.trim()}
              onClick={() => {
                if (selected) void update(selected.id, form);
                else
                  void create(form).then((created) => {
                    setSelectedId(created.id);
                    setWritingNew(false);
                  });
              }}
              className={clsx(
                "rounded-full border border-transparent bg-accent px-7 py-2.5 shadow-sm",
                "text-[13px] font-semibold text-bg transition-colors duration-150",
                "hover:bg-accentHover disabled:cursor-not-allowed disabled:bg-accent/60"
              )}
            >
              {t(translation.GlobalTerm.Save)}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
