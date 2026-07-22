import type { TemplateCreateOption } from "@renderer/shared/types/lazify";

interface TemplateOptionsPanelProps {
  options: TemplateCreateOption[];
  values: Record<string, boolean>;
  busy: boolean;
  onChange: (key: string, value: boolean) => void;
}

/**
 * Pre-flight toggles for scaffolder questions. Answering them here means the
 * CLI runs non-interactively and never stalls on a prompt the app cannot show.
 * Keys absent from `values` fall back to each option's declared default.
 */
export function TemplateOptionsPanel({
  options,
  values,
  busy,
  onChange,
}: Readonly<TemplateOptionsPanelProps>) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[30px] border border-border bg-soft p-6 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
        Scaffold options
      </p>
      <p className="mt-2 text-sm text-muted">
        These are applied when the project is generated.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const checked = values[option.key] ?? option.default;

          return (
            <label
              key={option.key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-base px-4 py-3 hover:border-accent"
            >
              <span className="text-sm font-semibold text-text">
                {option.label}
              </span>
              <input
                type="checkbox"
                checked={checked}
                disabled={busy}
                onChange={(event) => onChange(option.key, event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
