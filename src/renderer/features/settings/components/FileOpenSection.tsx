import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import {
  useInterfaceSettings,
  type FileOpensIn
} from "@renderer/shared/hooks/use-interface-settings";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { EditorPicker } from "./EditorPicker";
import { SectionLabel } from "./SectionLabel";

const TARGETS: Array<{ id: FileOpensIn; icon: UiIconName; label: string; hint: string }> = [
  {
    id: "app",
    icon: "code",
    label: translation.Settings.FileOpensInApp,
    hint: translation.Settings.FileOpensInAppDesc
  },
  {
    id: "editor",
    icon: "open-new-window",
    label: translation.Settings.FileOpensInEditor,
    hint: translation.Settings.FileOpensInEditorDesc
  }
];

export function FileOpenSection() {
  const { t } = useTranslation();
  const { fileOpensIn, setFileOpensIn, editorCommand, setEditorCommand } = useInterfaceSettings();

  return (
    <div>
      <SectionLabel>{t(translation.Settings.FileOpens)}</SectionLabel>

      <div className="grid gap-3 sm:grid-cols-2">
        {TARGETS.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => setFileOpensIn(target.id)}
            className={clsx(
              "flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors",
              fileOpensIn === target.id
                ? "border-accent/50 bg-accent/[0.06]"
                : "border-border bg-soft hover:border-accent/40"
            )}
          >
            <span className="flex items-center gap-2">
              <UiIcon
                name={target.icon}
                className={clsx("h-4 w-4", fileOpensIn === target.id ? "text-accent" : "text-muted")}
              />
              <span className="text-sm font-medium text-text">{t(target.label)}</span>
            </span>
            <span className="text-xs leading-5 text-muted">{t(target.hint)}</span>
          </button>
        ))}
      </div>

      {fileOpensIn === "editor" ? (
        <EditorPicker command={editorCommand} onChange={setEditorCommand} />
      ) : null}
    </div>
  );
}
