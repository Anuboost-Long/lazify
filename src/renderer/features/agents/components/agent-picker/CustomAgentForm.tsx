import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, OverlineText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
export interface CustomAgentFormProps {
  label: string;
  command: string;
  image: string | undefined;
  canSubmit: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onLabelChange: (value: string) => void;
  onCommandChange: (value: string) => void;
  onPickImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export function CustomAgentForm({
  label,
  command,
  image,
  canSubmit,
  fileInputRef,
  onLabelChange,
  onCommandChange,
  onPickImage,
  onCancel,
  onCreate,
}: Readonly<CustomAgentFormProps>) {
  const { t } = useTranslation();

  return (
      <div className="flex flex-col gap-4 px-6 py-5">
        <CaptionText tone="muted">{t(translation.Agents.CustomAgentDesc)}</CaptionText>

        <label className="flex flex-col gap-1.5">
          <OverlineText className="text-muted">{t(translation.Agents.NameLabel)}</OverlineText>
          <TextInput
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder={t(translation.Agents.NamePlaceholder)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <OverlineText className="text-muted">{t(translation.GlobalTerm.Command)}</OverlineText>
          <TextInput
            icon="terminal"
            value={command}
            onChange={(event) => onCommandChange(event.target.value)}
            placeholder={t(translation.Agents.CommandPlaceholder)}
            inputClassName="font-mono"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <OverlineText className="text-muted">{t(translation.Agents.IconLabel)}</OverlineText>
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden",
                "rounded-xl border border-border bg-bg text-muted"
              )}
            >
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <UiIcon name="media-image" className="h-5 w-5" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "rounded-xl border border-border bg-bg px-4 py-2 transition-colors duration-150",
                "text-text hover:border-accent/40 hover:text-accent"
              )}
            >
              <BodyText>{t(translation.Agents.ChooseImage)}</BodyText>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={clsx(
              "rounded-xl border border-border bg-bg px-4 py-2 transition-colors duration-150",
              "text-muted hover:border-accent/30 hover:text-text"
            )}
          >
            <BodyText>{t(translation.GlobalTerm.Cancel)}</BodyText>
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onCreate}
            className={clsx(
              "rounded-xl border px-4 py-2 transition-colors duration-150",
              "border-accent/40 bg-accent/10 text-accent",
              "enabled:hover:border-accent enabled:hover:bg-accent/[0.16]",
              "disabled:cursor-not-allowed disabled:opacity-45"
            )}
          >
            <BodyText tone="accent">{t(translation.Agents.CreateAgent)}</BodyText>
          </button>
        </div>
    </div>
  );
}
