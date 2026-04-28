import { PageHeader } from "@renderer/shared/ui/PageHeader";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { EnvironmentSummary } from "@renderer/shared/types/lazify";

interface SettingsPageProps {
  environment: EnvironmentSummary | null;
}

export function SettingsPage({ environment }: SettingsPageProps) {
  const items = [
    {
      label: "Node runtime",
      value: environment?.nodeVersion ?? "Unavailable",
      icon: "activity" as const
    },
    {
      label: "npm",
      value: environment?.npmVersion ?? "Unavailable",
      icon: "package" as const
    },
    {
      label: "yarn",
      value: environment?.yarnVersion ?? "Unavailable",
      icon: "refresh-circle" as const
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Local Runtime"
        title="Settings"
        description="This page holds environment and system-level details for the local Lazify installation."
        icon="settings"
      />

      <section className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-shell border border-border bg-soft p-5 shadow-[0_0_8px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-bg p-2 text-accent">
                <UiIcon name={item.icon} className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-text">{item.value}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
