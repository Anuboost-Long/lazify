import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { RouteScanWarning, UnsupportedConstruct } from "../types";

interface ScanReviewListProps {
  warnings: RouteScanWarning[];
  unsupported: UnsupportedConstruct[];
}

function toReviewItem(scanner: string, text: string, filePath: string | null, line: number | null) {
  const source = filePath && line ? `${filePath}:${line}` : filePath;
  return { key: `${scanner} ${text}`, text, source };
}

export function ScanReviewList({ warnings, unsupported }: Readonly<ScanReviewListProps>) {
  const { t } = useTranslation();
  const items = [
    ...warnings.map((warning) =>
      toReviewItem(warning.scanner, warning.message, warning.filePath, warning.line)
    ),
    ...unsupported.map((construct) =>
      toReviewItem(construct.scanner, construct.reason, construct.filePath, construct.line)
    )
  ];

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 px-1">
        <UiIcon name="warning-triangle" className="h-3.5 w-3.5 text-warning" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t(translation.ApiStudio.NeedsReview)}
        </span>
        <span className="rounded-full bg-text/[0.06] px-1.5 text-[10px] text-muted">
          {items.length}
        </span>
      </div>

      <ul className="mt-1.5 flex max-h-32 flex-col gap-1.5 overflow-y-auto">
        {items.map((item) => (
          <li key={item.key} className="px-1">
            <p className="text-[11px] leading-4 text-text">{item.text}</p>
            {item.source ? (
              <p className="font-mono text-[10px] leading-4 text-muted">{item.source}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
