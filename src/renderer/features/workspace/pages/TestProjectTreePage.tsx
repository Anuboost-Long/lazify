import { useState } from "react";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { ProjectTreeEditorPanel } from "@renderer/shared/ui/project-tree/ProjectTreeEditorPanel";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";

export function TestProjectTreePage() {
  const [selectedStructurePaths, setSelectedStructurePaths] = useState<string[]>([
    "app",
    "components",
    "lib",
    "hooks"
  ]);
  const [savedTree, setSavedTree] = useState<TreeNode[] | null>(null);
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false);
  const [showModuleSelectionToggle, setShowModuleSelectionToggle] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Temporary Route"
        title="Test"
        description="Sandbox for the shared project tree component."
        icon="play"
      />

      <section className="rounded-[24px] border border-border bg-soft p-4 shadow-panel">
        <label className="inline-flex items-center gap-3 text-sm font-medium text-text">
          <input
            type="checkbox"
            checked={showModuleSelectionToggle}
            onChange={(event) => setShowModuleSelectionToggle(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Show module selection in the project tree header
        </label>
      </section>

      <ProjectTreeEditorPanel
        busy={false}
        eyebrow="Project tree"
        title="Shared project tree sandbox"
        description="Use this route to test the reusable project-tree module in isolation."
        projectName="test-project"
        templateId="expo-default"
        templateLabel="Expo Starter"
        selectedStructurePaths={selectedStructurePaths}
        initialTree={savedTree}
        showModuleSelectionToggle={showModuleSelectionToggle}
        primaryActionLabel="No-op action"
        onPrimaryAction={() => undefined}
        onTreeChange={setSavedTree}
        moduleSheet={{
          open: moduleSheetOpen,
          onOpen: () => setModuleSheetOpen(true),
          onClose: () => setModuleSheetOpen(false),
          onToggleStructurePath: (path) =>
            setSelectedStructurePaths((current) =>
              current.includes(path)
                ? current.filter((item) => item !== path)
                : [...current, path]
            )
        }}
      />
    </div>
  );
}
