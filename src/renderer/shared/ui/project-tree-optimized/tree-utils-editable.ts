import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export const ROW_HEIGHT = 36;
export const OVERSCAN_COUNT = 12;

export function getFileVisual(name: string): { icon: UiIconName; color: string } {
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";

  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif"].includes(extension)) {
    return { icon: "media-image", color: "text-pink-300" };
  }

  if (["mp4", "mov", "webm", "avi", "mkv"].includes(extension)) {
    return { icon: "media-video", color: "text-violet-300" };
  }

  if (["json", "yml", "yaml", "toml", "env", "ini", "lock"].includes(extension) || name === "package.json") {
    return { icon: "database", color: "text-emerald-300" };
  }

  if (["ts", "tsx", "js", "jsx", "mjs", "cjs", "sh", "bash"].includes(extension)) {
    return { icon: "code", color: "text-[#ffcf66]" };
  }

  if (["css", "scss", "sass", "less"].includes(extension)) {
    return { icon: "css", color: "text-sky-300" };
  }

  if (["html", "htm"].includes(extension)) {
    return { icon: "html", color: "text-orange-300" };
  }

  if (["md", "mdx", "txt"].includes(extension)) {
    return { icon: "journal-page", color: "text-cyan-200" };
  }

  if (!extension) {
    return { icon: "empty-page", color: "text-slate-300" };
  }

  return { icon: "page", color: "text-slate-200" };
}
