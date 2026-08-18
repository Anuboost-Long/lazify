const stackLabelMap: Record<string, string> = {
  api: "API",
  bun: "Bun",
  cli: "CLI",
  cra: "CRA",
  electron: "Electron",
  expo: "Expo",
  js: "JS",
  nextjs: "Next.js",
  node: "Node",
  npm: "npm",
  pnpm: "pnpm",
  react: "React",
  vite: "Vite",
  yarn: "Yarn"
};

export function formatStackLabel(value: string) {
  return value
    .split("-")
    .map(
      (segment) =>
        stackLabelMap[segment] ??
        `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
    )
    .join(" ");
}
