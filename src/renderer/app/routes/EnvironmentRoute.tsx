import { useEffect } from "react";
import { EnvironmentPage } from "@renderer/features/environment/pages/EnvironmentPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function EnvironmentRoute() {
  const { toolScanReport, toolScanLoading, refreshToolScan } = useLazifyStore();

  useEffect(() => {
    if (!toolScanReport) {
      void refreshToolScan();
    }
  }, [toolScanReport, refreshToolScan]);

  return (
    <EnvironmentPage
      report={toolScanReport}
      loading={toolScanLoading}
      onRefresh={refreshToolScan}
    />
  );
}
