import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function InitProjectFlowRoute() {
  const { checkEnvironmentReadiness } = useLazifyStore();

  useEffect(() => {
    void checkEnvironmentReadiness();
  }, [checkEnvironmentReadiness]);

  return <Outlet />;
}
