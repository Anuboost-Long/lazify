import { useEffect } from "react";
import { EnvironmentPage } from "@/features/environment/pages/EnvironmentPage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

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
      onRefresh={() => void refreshToolScan(true)}
    />
  );
}
