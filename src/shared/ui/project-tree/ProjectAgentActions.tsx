import { createContext, useContext, type ReactNode } from "react";

interface ProjectAgentActionsProviderProps {
  children: ReactNode;
  onSendFileToAgent: (filePath: string) => void;
}

const ProjectAgentActionsContext = createContext<
  ((filePath: string) => void) | null
>(null);

export function ProjectAgentActionsProvider({
  children,
  onSendFileToAgent,
}: Readonly<ProjectAgentActionsProviderProps>) {
  return (
    <ProjectAgentActionsContext.Provider value={onSendFileToAgent}>
      {children}
    </ProjectAgentActionsContext.Provider>
  );
}

export function useProjectAgentActions() {
  return useContext(ProjectAgentActionsContext);
}
