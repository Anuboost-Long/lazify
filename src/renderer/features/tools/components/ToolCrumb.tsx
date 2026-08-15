import { useTranslation } from "react-i18next";

import { PageCrumb } from "@renderer/app/components/PageChrome";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ToolDefinition } from "../catalog";
import { toolColorVars } from "../lib/tool-colors";

/**
 * A tool's place in the breadcrumb: Tools › this tool.
 *
 * The root is the shell's own crumb and already leads back, so this only adds
 * the tail — and carries the tool's colour, the way its tile does.
 */
export function ToolCrumb({ tool }: Readonly<{ tool: ToolDefinition }>) {
  const { t } = useTranslation();

  return (
    <PageCrumb>
      <UiIcon name="arrow-right" className="h-3 w-3 shrink-0 text-muted" />

      <span className="flex min-w-0 items-center gap-1.5">
        <span
          style={toolColorVars(tool)}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--tool-icon)] text-[var(--tool)]"
        >
          <UiIcon name={tool.icon} className="h-2.5 w-2.5" />
        </span>
        <span className="truncate text-xs font-semibold text-text">{t(tool.label)}</span>
      </span>
    </PageCrumb>
  );
}
