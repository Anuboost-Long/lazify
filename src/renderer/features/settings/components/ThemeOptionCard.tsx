import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Typography } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { ThemePreview } from "./ThemePreview";

interface ThemeOptionCardProps {
  id: string;
  label: string;
  icon: UiIconName;
  selected: boolean;
  onSelect: (themeId: string) => void;
}

export function ThemeOptionCard({ id, label, icon, selected, onSelect }: ThemeOptionCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={clsx(
        "group relative flex flex-col items-center gap-3 rounded-2xl border p-5",
        "transition-all duration-150",
        selected
          ? "border-accent bg-accentSoft shadow-panel ring-1 ring-accent/30"
          : "border-border bg-soft hover:border-accent/40"
      )}
    >
      <ThemePreview themeId={id} />

      <div className="flex items-center gap-2">
        <UiIcon name={icon} className={clsx("h-4 w-4", selected ? "text-accent" : "text-muted")} />
        <Typography
          as="span"
          variant="body"
          className={clsx("font-semibold", selected ? "text-accent" : "text-muted")}
        >
          {t(label)}
        </Typography>
      </div>

      {selected && (
        <span className="absolute right-3 top-3">
          <UiIcon name="check-circle" className="h-4 w-4 text-accent" />
        </span>
      )}
    </button>
  );
}
