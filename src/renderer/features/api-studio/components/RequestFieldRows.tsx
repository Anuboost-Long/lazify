import clsx from "clsx";

export interface RequestField {
  key: string;
  label: string;
  meta: string[];
  detail: string | null;
  placeholder: string;
}

interface RequestFieldRowsProps {
  fields: RequestField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function RequestFieldRows({ fields, values, onChange }: Readonly<RequestFieldRowsProps>) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {fields.map((field) => (
        <li key={field.key} className="py-2.5 first:pt-0 last:pb-0">
          <label className="flex flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-text">{field.label}</span>
              {field.meta.map((value) => (
                <span
                  key={value}
                  className="rounded-md bg-text/[0.06] px-1.5 py-0.5 text-[10px] text-muted"
                >
                  {value}
                </span>
              ))}
            </span>

            <input
              value={values[field.key] ?? ""}
              spellCheck={false}
              autoComplete="off"
              placeholder={field.placeholder}
              onChange={(event) => onChange(field.key, event.target.value)}
              className={clsx(
                "h-8 w-full rounded-lg border border-border bg-bg/45 px-2.5 font-mono text-xs",
                "text-text outline-none placeholder:text-muted/70 focus:border-accent/50"
              )}
            />

            {field.detail ? (
              <span className="text-xs leading-5 text-muted">{field.detail}</span>
            ) : null}
          </label>
        </li>
      ))}
    </ul>
  );
}
