import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { ApiBody } from "../types";

interface RequestBodyPanelProps {
  body: ApiBody;
}

export function RequestBodyPanel({ body }: Readonly<RequestBodyPanelProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {body.description ? (
        <p className="text-xs leading-5 text-muted">{body.description}</p>
      ) : null}

      {body.variants.map((variant) => (
        <section key={variant.mediaType} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text">{variant.mediaType}</span>
            {variant.schemaType ? (
              <span className="rounded-md bg-text/[0.06] px-1.5 py-0.5 text-[10px] text-muted">
                {variant.schemaType}
              </span>
            ) : null}
            {body.required ? (
              <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                {t(translation.ApiStudio.Required)}
              </span>
            ) : null}
          </div>

          {variant.example ? (
            <pre
              className={clsx(
                "max-h-56 overflow-auto rounded-lg border border-border bg-bg/45 p-3",
                "font-mono text-[11px] leading-5 text-text"
              )}
            >
              {variant.example}
            </pre>
          ) : null}
        </section>
      ))}
    </div>
  );
}
