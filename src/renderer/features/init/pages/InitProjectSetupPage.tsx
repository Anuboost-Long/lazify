import { PageCrumb } from "@renderer/app/components/PageChrome";
import { ProjectSetupSection } from "@renderer/features/init/components/ProjectSetupSection";
import { translation } from "@renderer/i18n/translation";
import type { TemplateOption } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface InitProjectSetupPageProps {
  busy: boolean;
  sourceMode: "stack" | "imported";
  sourceLabel: string;
  projectName: string;
  projectDirectory: string;
  packageName: string;
  selectedTemplateId: string;
  templateOptions: TemplateOption[];
  createOptionValues: Record<string, boolean>;
  onChangeSelection: () => void;
  onProjectNameChange: (value: string) => void;
  onPackageNameChange: (value: string) => void;
  onBrowseDirectory: () => void;
  onContinue: () => void;
  onCreateOptionChange: (key: string, value: boolean) => void;
}

export function InitProjectSetupPage(props: Readonly<InitProjectSetupPageProps>) {
  const { t } = useTranslation();

  return (
    <>
      <PageCrumb>
        <span className="text-xs text-muted/50">/</span>
        <span className="text-xs font-medium text-text">
          {t(translation.WorkflowForm.Title)}
        </span>
      </PageCrumb>

      <ProjectSetupSection {...props} />
    </>
  );
}
