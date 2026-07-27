import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageActions } from "@renderer/app/components/PageChrome";
import { BodyText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ToolCategory, ToolScanReport } from "@renderer/shared/types/lazify";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { translation } from "@renderer/i18n/translation";
import { CategorySection } from "../components/CategorySection";
import { NodeVersionModal } from "../components/NodeVersionModal";
import { InstallToolModal } from "../components/InstallToolModal";
import { UpdateToolModal } from "../components/UpdateToolModal";
import { PortReaperSection } from "../components/PortReaperSection";

interface EnvironmentPageProps {
  report: ToolScanReport | null;
  loading: boolean;
  onRefresh: () => void;
}

const categoryOrder: ToolCategory[] = ["nodejs", "python", "dotnet", "system"];

export function EnvironmentPage({ report, loading, onRefresh }: EnvironmentPageProps) {
  const { t } = useTranslation();
  const { refreshSingleTool } = useLazifyStore();
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [installTarget, setInstallTarget] = useState<ToolScanReport["tools"][number] | null>(null);
  const [installOpen, setInstallOpen] = useState(false);

  const openInstall = (tool: ToolScanReport["tools"][number]) => {
    setInstallTarget(tool);
    setInstallOpen(true);
  };

  const closeInstall = () => {
    setInstallOpen(false);
    setTimeout(() => setInstallTarget(null), 350);
  };

  const [updateTarget, setUpdateTarget] = useState<ToolScanReport["tools"][number] | null>(null);
  const [updateInfo, setUpdateInfo] = useState<import("@renderer/shared/types/lazify").ToolUpdateInfo | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [loadingTool, setLoadingTool] = useState<string | null>(null);

  const openUpdate = async (tool: ToolScanReport["tools"][number]) => {
    setLoadingTool(tool.name);
    const info = await globalThis.lazify.checkToolUpdate(tool.name, tool.version ?? "");
    setLoadingTool(null);
    setUpdateTarget(tool);
    setUpdateInfo(info);
    setUpdateOpen(true);
  };

  const closeUpdate = () => {
    setUpdateOpen(false);
    setTimeout(() => { setUpdateTarget(null); setUpdateInfo(null); }, 350);
  };

  const groupedTools = categoryOrder.reduce<Record<ToolCategory, ToolScanReport["tools"]>>(
    (acc, category) => {
      acc[category] = report?.tools.filter((t) => t.category === category) ?? [];
      return acc;
    },
    { nodejs: [], python: [], dotnet: [], system: [] }
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page's name and icon are already in the shell's top bar, so the
          only thing worth putting up there is the action. */}
      <PageActions>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={clsx(
            "group inline-flex items-center gap-1.5",
            "rounded-[8px] border border-border bg-bg px-3 py-1",
            "text-xs font-semibold text-muted",
            "hover:border-accent hover:text-text",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <UiIcon
            name="refresh-circle"
            className={clsx(
              "h-3.5 w-3.5 text-muted group-hover:text-accent",
              loading && "animate-spin"
            )}
          />
          {loading ? t(translation.GlobalTerm.Scanning) : t(translation.GlobalTerm.Refresh)}
        </button>
      </PageActions>

      {loading && !report && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin" />
          <BodyText as="span" className="text-muted">
            {t(translation.Environment.ScanningMachine)}
          </BodyText>
        </div>
      )}

      {!loading && !report && (
        <BodyText className="text-muted">{t(translation.Environment.NoResults)}</BodyText>
      )}

      {report && (
        <div className="flex flex-col gap-10">
          {categoryOrder.map((category) =>
            groupedTools[category].length > 0 ? (
              <CategorySection
                key={category}
                category={category}
                tools={groupedTools[category]}
                loadingTool={loadingTool}
                onNvmAction={() => setNodeModalOpen(true)}
                onInstall={openInstall}
                onUpdate={openUpdate}
              />
            ) : null
          )}
        </div>
      )}

      {/* Sits under the tool inventory: same question ("what is on this
          machine"), but the answer changes minute to minute rather than
          install to install, so it scans on its own. */}
      <PortReaperSection />

      <NodeVersionModal
        open={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        onSelect={() => {
          void refreshSingleTool("node");
          void refreshSingleTool("npm");
        }}
      />

      <InstallToolModal
        tool={installTarget}
        open={installOpen}
        onClose={closeInstall}
        onInstalled={(toolName) => { closeInstall(); void refreshSingleTool(toolName); }}
      />

      <UpdateToolModal
        tool={updateTarget}
        updateInfo={updateInfo}
        open={updateOpen}
        onClose={closeUpdate}
        onUpdated={(toolName) => void refreshSingleTool(toolName)}
      />
    </div>
  );
}
