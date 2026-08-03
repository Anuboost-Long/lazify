import { useTranslation } from "react-i18next";

import type { StarterFailureReason } from "@main/scaffolding/starter-provisioner";
import { translation } from "@renderer/i18n/translation";
import { CardTitle, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface StarterFailureNoticeProps {
  reason: StarterFailureReason;
}

/**
 * Each reason gets its own icon, because the difference the user cares about is
 * whether the fix is theirs. Being offline is; a missing starter is not.
 */
const NOTICE: Record<
  StarterFailureReason,
  { icon: "globe" | "warning-triangle"; title: string; message: string }
> = {
  offline: {
    icon: "globe",
    title: translation.StarterFailure.OfflineTitle,
    message: translation.StarterFailure.OfflineMessage
  },
  unreachable: {
    icon: "warning-triangle",
    title: translation.StarterFailure.UnreachableTitle,
    message: translation.StarterFailure.UnreachableMessage
  },
  "git-missing": {
    icon: "warning-triangle",
    title: translation.StarterFailure.GitMissingTitle,
    message: translation.StarterFailure.GitMissingMessage
  },
  "clone-failed": {
    icon: "warning-triangle",
    title: translation.StarterFailure.CloneFailedTitle,
    message: translation.StarterFailure.CloneFailedMessage
  }
};

/**
 * Shown when a starter clone failed. The status strip already carries git's own
 * words, which are worth keeping for a log but are not an instruction; this says
 * the one thing the user can act on.
 */
export function StarterFailureNotice({ reason }: Readonly<StarterFailureNoticeProps>) {
  const { t } = useTranslation();
  const notice = NOTICE[reason];

  return (
    <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error/[0.06] px-4 py-3">
      <UiIcon name={notice.icon} className="mt-0.5 h-4 w-4 shrink-0 text-error" />

      <div className="min-w-0">
        <CardTitle className="!text-text">{t(notice.title)}</CardTitle>
        <SmallText className="!text-muted mt-1 block">{t(notice.message)}</SmallText>
      </div>
    </div>
  );
}
