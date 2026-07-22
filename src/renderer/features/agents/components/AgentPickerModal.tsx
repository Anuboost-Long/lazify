import clsx from "clsx";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import { AgentGlyph } from "./AgentGlyph";

interface CustomAgentInput {
  label: string;
  command: string;
  image?: string;
}

interface AgentPickerModalProps {
  open: boolean;
  agents: AgentDescriptor[];
  onSelect: (agentId: string) => void;
  onClose: () => void;
  onCreate: (input: CustomAgentInput) => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
}

const ACCENT_LINE = {
  background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
  opacity: 0.55,
} as const;

export function AgentPickerModal({
  open,
  agents,
  onSelect,
  onClose,
  onCreate,
  onDelete,
}: Readonly<AgentPickerModalProps>) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [command, setCommand] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCreating(false);
    setLabel("");
    setCommand("");
    setImage(undefined);
    setBusy(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelect = (agentId: string) => {
    onSelect(agentId);
    handleClose();
  };

  const handlePickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };

  const canSubmit = label.trim().length > 0 && command.trim().length > 0 && !busy;

  const handleCreate = async () => {
    if (!canSubmit) return;

    setBusy(true);
    try {
      await onCreate({ label: label.trim(), command: command.trim(), image });
      resetForm();
    } catch {
      setBusy(false);
    }
  };

  const handleDelete = async (event: React.MouseEvent, agentId: string) => {
    event.stopPropagation();
    await onDelete(agentId);
  };

  return (
    <BaseModal open={open} onClose={handleClose}>
      <div
        className={clsx(
          "w-[480px] max-w-[calc(100vw-2rem)] overflow-hidden",
          "rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        <div className="relative overflow-hidden border-b border-border px-6 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={ACCENT_LINE} />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {creating ? (
                <button
                  type="button"
                  onClick={resetForm}
                  aria-label={t(translation.GlobalTerm.Back)}
                  className={clsx(
                    "rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
                    "text-muted hover:border-accent/30 hover:text-text"
                  )}
                >
                  <UiIcon name="arrow-left" className="h-4 w-4" />
                </button>
              ) : null}
              <div>
                <OverlineText className="text-muted">{t(translation.Agents.Eyebrow)}</OverlineText>
                <SectionTitle className="mt-1 text-2xl">
                  {creating
                    ? t(translation.Agents.CustomAgentTitle)
                    : t(translation.Agents.ChooseAgent)}
                </SectionTitle>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t(translation.GlobalTerm.Close)}
              className={clsx(
                "rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
                "text-muted hover:border-accent/30 hover:text-text"
              )}
            >
              <UiIcon name="xmark" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {creating ? (
          <div className="flex flex-col gap-4 px-6 py-5">
            <CaptionText tone="muted">{t(translation.Agents.CustomAgentDesc)}</CaptionText>

            <label className="flex flex-col gap-1.5">
              <OverlineText className="text-muted">{t(translation.Agents.NameLabel)}</OverlineText>
              <TextInput
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={t(translation.Agents.NamePlaceholder)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <OverlineText className="text-muted">{t(translation.GlobalTerm.Command)}</OverlineText>
              <TextInput
                icon="terminal"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
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
                  onChange={handlePickImage}
                  className="hidden"
                />
              </div>
            </div>

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
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
                onClick={handleCreate}
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
        ) : (
          <div className="flex flex-col gap-2 px-6 py-5">
            <CaptionText tone="muted">{t(translation.Agents.ChooseAgentDesc)}</CaptionText>

            {agents.map((agent) => (
              <div
                key={agent.id}
                className={clsx(
                  "flex items-center gap-2 rounded-2xl border px-2 py-1",
                  "border-border bg-bg transition-colors duration-150",
                  agent.available
                    ? "hover:border-accent/50 hover:bg-accent/[0.06]"
                    : "opacity-45"
                )}
              >
                <button
                  type="button"
                  disabled={!agent.available}
                  onClick={() => handleSelect(agent.id)}
                  className="flex flex-1 items-center justify-between gap-3 px-2 py-2 text-left disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center",
                        "rounded-xl border border-border bg-soft"
                      )}
                    >
                      <AgentGlyph
                        agentId={agent.id}
                        image={agent.image}
                        className="h-[18px] w-[18px]"
                      />
                    </div>
                    <BodyText>{agent.label}</BodyText>
                  </div>

                  {agent.available ? (
                    <UiIcon name="arrow-right" className="h-4 w-4 text-muted" />
                  ) : (
                    <CaptionText tone="muted">{t(translation.Agents.NotInstalled)}</CaptionText>
                  )}
                </button>

                {agent.custom ? (
                  <button
                    type="button"
                    aria-label={t(translation.Agents.RemoveAgent)}
                    onClick={(event) => void handleDelete(event, agent.id)}
                    className={clsx(
                      "mr-1 shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-150",
                      "hover:bg-error/10 hover:text-error"
                    )}
                  >
                    <UiIcon name="trash" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setCreating(true)}
              className={clsx(
                "mt-1 flex items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3",
                "border-border text-muted transition-colors duration-150",
                "hover:border-accent/50 hover:text-accent"
              )}
            >
              <UiIcon name="plus" className="h-4 w-4" />
              <BodyText>{t(translation.Agents.AddCustomAgent)}</BodyText>
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
