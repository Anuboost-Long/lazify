import clsx from "clsx";

interface ThemePreviewProps {
  themeId: string;
}

export function ThemePreview({ themeId }: ThemePreviewProps) {
  const isLight = themeId === "light";

  return (
    <div
      className={clsx(
        "w-full rounded-xl border p-2 pb-3",
        isLight
          ? "border-gray-200 bg-gray-100"
          : themeId === "dark"
            ? "border-white/10 bg-[#0b1220]"
            : "border-white/10 bg-gradient-to-br from-[#0b1220] to-gray-700"
      )}
    >
      <div className={clsx("mb-2 h-1.5 w-2/3 rounded-full", isLight ? "bg-gray-300" : "bg-white/20")} />
      <div className="flex gap-1">
        <div className={clsx("h-5 w-5 rounded-md", isLight ? "bg-gray-200" : "bg-white/10")} />
        <div className="flex-1 space-y-1">
          <div className={clsx("h-1 rounded-full", isLight ? "bg-gray-300" : "bg-white/20")} />
          <div className={clsx("h-1 w-3/4 rounded-full", isLight ? "bg-gray-200" : "bg-white/10")} />
        </div>
      </div>
    </div>
  );
}
