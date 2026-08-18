import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { ApiEnvironment, ApiVariable } from "../types";
import { EnvironmentTabs } from "./EnvironmentTabs";
import { VariableRow } from "./VariableRow";

interface EnvironmentModalProps {
  open: boolean;
  variables: ApiVariable[];
  environments: ApiEnvironment[];
  active: ApiEnvironment;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onChange: (values: Record<string, string>) => void;
  onClose: () => void;
}

export function EnvironmentModal(props: Readonly<EnvironmentModalProps>) {
  return (
    <BaseModal open={props.open} onClose={props.onClose}>
      {props.open ? <EnvironmentCard {...props} /> : null}
    </BaseModal>
  );
}

function EnvironmentCard({
  variables,
  environments,
  active,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
  onChange,
  onClose
}: Readonly<EnvironmentModalProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex max-h-[80vh] w-[min(560px,92vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>{t(translation.ApiStudio.Environments)}</SectionTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.ApiStudio.Close)}
            className="text-muted transition-colors hover:text-text"
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <EnvironmentTabs
          environments={environments}
          activeId={active.id}
          onSelect={onSelect}
          onAdd={onAdd}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />

        <label className="flex flex-col gap-1">
          <span className="sr-only">{t(translation.ApiStudio.EnvironmentName)}</span>
          <input
            value={active.name}
            spellCheck={false}
            placeholder={t(translation.ApiStudio.EnvironmentName)}
            onChange={(event) => onRename(active.id, event.target.value)}
            className={clsx(
              "h-9 w-full rounded-lg border border-border bg-bg/45 px-3",
              "text-xs font-semibold text-text outline-none focus:border-accent/50"
            )}
          />
        </label>

        <p className="text-xs leading-5 text-muted">
          {t(translation.ApiStudio.StoredInProject)}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {variables.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {variables.map((variable) => (
              <li key={variable.name} className="py-3 first:pt-0 last:pb-0">
                <VariableRow
                  variable={variable}
                  value={active.values[variable.name] ?? ""}
                  onChange={(value) => onChange({ ...active.values, [variable.name]: value })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-xs text-muted">
            {t(translation.ApiStudio.NoVariables)}
          </p>
        )}
      </div>
    </div>
  );
}
