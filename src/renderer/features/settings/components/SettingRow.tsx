import type { ReactNode } from "react";
import { BodyText, SmallText } from "@renderer/shared/typography";

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="flex-1">
        <BodyText className="font-semibold">{label}</BodyText>
        {description && <SmallText className="mt-0.5 leading-5">{description}</SmallText>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
