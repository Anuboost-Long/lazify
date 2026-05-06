import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { CardTitle, OverlineText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface RuntimeCardProps {
  label: string;
  value: string;
  icon: UiIconName;
}

export function RuntimeCard({ label, value, icon }: RuntimeCardProps) {
  const { t } = useTranslation();

  return (
    <article className={clsx("rounded-shell border border-border bg-soft p-5", "shadow-panel")}>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-border bg-bg p-2 text-accent">
          <UiIcon name={icon} className="h-5 w-5" />
        </div>
        <div>
          <OverlineText>{t(label)}</OverlineText>
          <CardTitle className="mt-1">{value}</CardTitle>
        </div>
      </div>
    </article>
  );
}
