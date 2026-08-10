import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { EditorPaneNotice } from "@renderer/shared/ui/code/EditorPaneShell";

interface PdfPreviewProps {
  url: string | null;
  fileName: string;
}

/**
 * Hands the document to Chromium's own PDF viewer, which arrives with paging,
 * zoom, search and printing already built. It only runs with `plugins` enabled
 * on the window — see the main process's `webPreferences`.
 */
export function PdfPreview({ url, fileName }: Readonly<PdfPreviewProps>) {
  const { t } = useTranslation();

  if (!url) {
    return (
      <EditorPaneNotice
        chrome="flush"
        title={t(translation.ProjectTree.LoadingFilePreview)}
        description={t(translation.ProjectTree.LoadingFilePreviewDesc)}
      />
    );
  }

  return (
    <iframe
      src={url}
      title={fileName}
      className="h-full w-full border-0 bg-bg"
    />
  );
}
