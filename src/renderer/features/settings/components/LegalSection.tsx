import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getLegalRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { BodyText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { legalItems } from "./settings-config";
import { SectionLabel } from "./SectionLabel";

export function LegalSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.Legal)}</SectionLabel>
      <div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
        {legalItems.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => navigate(getLegalRoute(item.slug))}
            className="group flex w-full items-center justify-between px-5 py-4 text-left hover:bg-bg"
          >
            <BodyText className="font-semibold">{t(item.label)}</BodyText>
            <UiIcon
              name="arrow-right"
              className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
