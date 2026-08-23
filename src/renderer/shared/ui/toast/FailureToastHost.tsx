import { useTranslation } from "react-i18next";

import { Toast } from "@renderer/shared/ui/toast/Toast";
import { dismissFailure, useFailureNotice } from "@renderer/shared/ui/toast/failure-toast";

export function FailureToastHost() {
  const { t } = useTranslation();
  const notice = useFailureNotice();

  if (!notice) return null;

  return (
    <Toast
      key={notice.id}
      title={t(notice.titleKey)}
      message={t(notice.messageKey)}
      onClose={dismissFailure}
    />
  );
}
