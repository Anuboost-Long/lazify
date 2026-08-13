import { createContext, useContext, type ReactNode } from "react";

import type { CodeSelectionAction } from "./code-selection";

const CodeSelectionActionsContext = createContext<CodeSelectionAction[]>([]);

export function CodeSelectionActionsProvider({
  actions,
  children
}: Readonly<{ actions: CodeSelectionAction[]; children: ReactNode }>) {
  return (
    <CodeSelectionActionsContext.Provider value={actions}>
      {children}
    </CodeSelectionActionsContext.Provider>
  );
}

export function useCodeSelectionActions(): CodeSelectionAction[] {
  return useContext(CodeSelectionActionsContext);
}
