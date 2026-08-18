export interface DefinitionRow {
  key: string;
  label: string;
  meta: string[];
  detail: string | null;
}

interface DefinitionRowsProps {
  rows: DefinitionRow[];
}

export function DefinitionRows({ rows }: Readonly<DefinitionRowsProps>) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text">{row.label}</span>
            {row.meta.map((value) => (
              <span
                key={value}
                className="rounded-md bg-text/[0.06] px-1.5 py-0.5 text-[10px] text-muted"
              >
                {value}
              </span>
            ))}
          </div>
          {row.detail ? <p className="text-xs leading-5 text-muted">{row.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}
