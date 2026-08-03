import { useTranslation } from "react-i18next";

import { CaptionText, PillText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface FieldProps {
  icon: UiIconName;
  label: string;
  hint: string;
  children: React.ReactNode;
}

/** A labelled control in the panel, so every field reads as one group. */
export function Field({ icon, label, hint, children }: FieldProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <UiIcon name={icon} className="h-3 w-3 shrink-0 text-muted" />
        <PillText as="span" className="!text-muted">
          {t(label)}
        </PillText>
      </div>

      {children}

      <CaptionText tone="muted" className="leading-relaxed">
        {t(hint)}
      </CaptionText>
    </div>
  );
}
