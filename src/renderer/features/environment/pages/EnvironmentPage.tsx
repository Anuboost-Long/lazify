import clsx from "clsx";
import { useState } from "react";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ToolCategory, ToolScanReport } from "@renderer/shared/types/lazify";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { CategorySection } from "../components/CategorySection";
import { NodeVersionModal } from "../components/NodeVersionModal";
import { InstallToolModal } from "../components/InstallToolModal";
import { UpdateToolModal } from "../components/UpdateToolModal";

interface EnvironmentPageProps {
  report: ToolScanReport | null;
  loading: boolean;
  onRefresh: () => void;
}

const categoryOrder: ToolCategory[] = ["nodejs", "python", "dotnet", "system"];

export function EnvironmentPage({ report, loading, onRefresh }: EnvironmentPageProps) {
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
    const info = await window.lazify.checkToolUpdate(tool.name, tool.version ?? "");
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Local Machine"
          title="Environment"
          description="Installed runtimes, package managers, and development tools detected on this machine."
          icon="activity"
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={clsx(
            "group flex items-center gap-2",
            "rounded-[20px] border border-border bg-bg px-4 py-3",
            "text-sm font-semibold text-muted",
            "hover:border-accent hover:text-text",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <UiIcon
            name="refresh-circle"
            className={clsx("h-5 w-5 text-muted group-hover:text-accent", loading && "animate-spin")}
          />
          {loading ? "Scanning…" : "Refresh"}
        </button>
      </div>

      {loading && !report && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin" />
          Scanning local machine…
        </div>
      )}

      {!loading && !report && (
        <p className="text-sm text-muted">No scan results yet.</p>
      )}

      {report && (
        <div className="flex flex-col gap-4">
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
