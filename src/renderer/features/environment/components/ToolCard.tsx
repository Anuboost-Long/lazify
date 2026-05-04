import type { DetectedTool } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";

interface ToolCardProps {
  tool: DetectedTool;
  onAction?: () => void;
  actionLabel?: string;
  loading?: boolean;
}

export function ToolCard({
  tool,
  onAction,
  actionLabel,
  loading,
}: ToolCardProps) {
  const Tag = onAction ? "button" : "article";
  const isClickable = !!onAction && !loading;

  return (
    <Tag
      {...(isClickable ? { type: "button" as const, onClick: onAction } : {})}
      disabled={loading || undefined}
      className={clsx(
        "group relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left",
        "transition-[transform,border-color,box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        loading && "cursor-wait",
        !loading && tool.available
          ? [
              "border-accent hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow",
              "bg-[linear-gradient(140deg,rgba(16,185,129,0.07)_0%,transparent_55%)]",
            ]
          : !loading && onAction
          ? "!border-error bg-soft shadow-[0_2px_10px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:border-warning/40 hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)]"
          : "!border-border bg-soft shadow-[0_2px_10px_rgba(0,0,0,0.07)]"
      )}
    >
      {/* Top shimmer line — available only */}
      {tool.available && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent 5%, var(--color-accent) 50%, transparent 95%)",
            opacity: 0.45,
          }}
        />
      )}

      {/* Left accent rail */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full transition-opacity duration-200",
          tool.available
            ? "bg-accent opacity-70 group-hover:opacity-100"
            : "bg-border/30 opacity-100"
        )}
      />

      <div className="flex items-center gap-3 pl-1.5">
        {/* Icon */}
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
            tool.available
              ? "border-transparent bg-accent text-white shadow-[0_0_16px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_22px_rgba(16,185,129,0.45)]"
              : "border-transparent bg-error text-white shadow-[0_0_12px_rgba(244,63,94,0.25)]"
          )}
        >
          <UiIcon
            name={tool.available ? "check-circle" : "xmark"}
            className="h-[18px] w-[18px]"
          />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              "truncate text-sm font-semibold leading-none",
              tool.available ? "text-text" : "!text-error"
            )}
          >
            {tool.displayName}
          </p>
          <p
            className={clsx(
              "mt-1.5 truncate text-[11px] font-medium",
              tool.available ? "!text-accent" : "!text-muted/35"
            )}
          >
            {tool.available ? tool.version ?? "Detected" : "Not installed"}
          </p>
        </div>

        {/* Right slot */}
        {loading ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
            <UiIcon
              name="refresh-circle"
              className="h-4 w-4 animate-spin text-accent"
            />
          </div>
        ) : onAction ? (
          <span
            className={clsx(
              "shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
              "transition-colors duration-150",
              tool.available
                ? "border-accent/25 bg-accent/12 text-accent/80 group-hover:border-accent/45 group-hover:bg-accent/20"
                : "border-border/70 bg-soft text-error/80 group-hover:border-warning/40 group-hover:text-warning/80"
            )}
          >
            {actionLabel ?? "Open"}
          </span>
        ) : (
          <span
            className={clsx(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
              tool.available
                ? "border-accent/25 bg-accent/12 text-accent"
                : "border-border/60 bg-soft text-muted/40"
            )}
          >
            {tool.available ? "Installed" : "Missing"}
          </span>
        )}
      </div>
    </Tag>
  );
}
