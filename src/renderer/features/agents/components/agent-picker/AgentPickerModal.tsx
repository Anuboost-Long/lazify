import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { AgentDescriptor } from "../../../../../main/agents/agent-registry";
import type { AgentSessionSummary } from "../../../../../main/agents/agent-sessions";
import { AgentGlyph } from "../AgentGlyph";
import { AgentChoiceList } from "./AgentChoiceList";
import { CustomAgentForm } from "./CustomAgentForm";
import { ResumeSessionList } from "./ResumeSessionList";

interface CustomAgentInput {
  label: string;
  command: string;
  image?: string;
}

interface AgentPickerModalProps {
  open: boolean;
  agents: AgentDescriptor[];

  projectPath: string;

  onSelect: (agentId: string, resumeSessionId?: string) => void;
  onClose: () => void;
  onCreate: (input: CustomAgentInput) => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
  onBack?: () => void;
}

const ACCENT_LINE = {
  background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
  opacity: 0.55,
} as const;

export function AgentPickerModal({
  open,
  agents,
  projectPath,
  onSelect,
  onClose,
  onCreate,
  onDelete,
  onBack,
}: Readonly<AgentPickerModalProps>) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);

  const [browsing, setBrowsing] = useState(false);
  const [sessions, setSessions] = useState<AgentSessionSummary[] | null>(null);
  const [label, setLabel] = useState("");
  const [command, setCommand] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCreating(false);
    setBrowsing(false);
    setLabel("");
    setCommand("");
    setImage(undefined);
    setBusy(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelect = (agentId: string, resumeSessionId?: string) => {
    onSelect(agentId, resumeSessionId);
    handleClose();
  };

  useEffect(() => {
    if (!browsing || !projectPath) return;

    let cancelled = false;
    setSessions(null);

    void globalThis.lazify.listAgentSessions(projectPath).then((result) => {
      if (!cancelled) setSessions(result);
    });

    return () => {
      cancelled = true;
    };
  }, [browsing, projectPath]);

  const resumable = (sessions ?? []).filter((session) =>
    agents.some((agent) => agent.id === session.agentId && agent.available)
  );

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
              {creating || browsing || onBack ? (
                <button
                  type="button"
                  onClick={creating || browsing ? resetForm : onBack}
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
                    : browsing
                      ? t(translation.Agents.ResumeSession)
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
          <CustomAgentForm
            label={label}
            command={command}
            image={image}
            canSubmit={canSubmit}
            fileInputRef={fileInputRef}
            onLabelChange={setLabel}
            onCommandChange={setCommand}
            onPickImage={handlePickImage}
            onCancel={resetForm}
            onCreate={() => void handleCreate()}
          />
        ) : browsing ? (
          <ResumeSessionList
            sessions={sessions}
            resumable={resumable}
            onSelect={handleSelect}
          />
        ) : (
          <AgentChoiceList
            agents={agents}
            projectPath={projectPath}
            onSelect={handleSelect}
            onDelete={(event, agentId) => void handleDelete(event, agentId)}
            onBrowse={() => setBrowsing(true)}
            onCreate={() => setCreating(true)}
          />
        )}
      </div>
    </BaseModal>
  );
}

