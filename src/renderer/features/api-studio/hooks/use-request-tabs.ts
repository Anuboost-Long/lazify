import { useEffect, useState } from "react";

export interface RequestTab {
  kind: "route" | "custom";
  id: string;
  exampleId?: string;
}

export function tabKey(tab: RequestTab) {
  return tab.exampleId ? `${tab.kind}:${tab.id}:${tab.exampleId}` : `${tab.kind}:${tab.id}`;
}

export function useRequestTabs(projectPath: string) {
  const [open, setOpen] = useState<RequestTab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    setOpen([]);
    setActiveKey(null);
  }, [projectPath]);

  const activateNearest = (removed: RequestTab[], index: number) =>
    setActiveKey(removed.length === 0 ? null : tabKey(removed[Math.min(index, removed.length - 1)]));

  return {
    open,
    activeKey,
    active: open.find((tab) => tabKey(tab) === activeKey) ?? null,
    show: (tab: RequestTab) => {
      setOpen((current) =>
        current.some((entry) => tabKey(entry) === tabKey(tab)) ? current : [...current, tab]
      );
      setActiveKey(tabKey(tab));
    },
    activate: setActiveKey,
    close: (key: string) => {
      const index = open.findIndex((tab) => tabKey(tab) === key);

      if (index === -1) return;

      const next = open.filter((_, position) => position !== index);

      setOpen(next);
      if (key === activeKey) activateNearest(next, index);
    },
    closeAll: () => {
      setOpen([]);
      setActiveKey(null);
    },
    keep: (stillOpen: (tab: RequestTab) => boolean) => {
      const next = open.filter(stillOpen);

      if (next.length === open.length) return;

      setOpen(next);
      if (activeKey && !next.some((tab) => tabKey(tab) === activeKey)) activateNearest(next, 0);
    }
  };
}
