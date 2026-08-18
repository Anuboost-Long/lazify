import type { ITheme } from "@xterm/xterm";

// Exactly --color-terminal (dark). The gutter around the canvas is painted
// with the same token, so the terminal and its panel are seamless.
const DARK_THEME: ITheme = {
  background: "#111827",
  foreground: "#ffffff",
  black: "#1a1e2e",
  red: "#f07178",
  green: "#c3e88d",
  yellow: "#ffcb6b",
  blue: "#82aaff",
  magenta: "#c792ea",
  cyan: "#89ddff",
  white: "#ffffff",
  brightBlack: "#7c869e",
  brightRed: "#f07178",
  brightGreen: "#c3e88d",
  brightYellow: "#ffcb6b",
  brightBlue: "#82aaff",
  brightMagenta: "#c792ea",
  brightCyan: "#89ddff",
  brightWhite: "#ffffff",
  cursor: "#c792ea",
  cursorAccent: "#111827",
  selectionBackground: "#c792ea40",
};

// Exactly --color-terminal (light): a shade under the page rather than the
// paper-white of --color-bg-soft, since a terminal is a wall of text someone
// reads for minutes at a time. Every hue is darkened, since the dark palette's
// pastels are barely legible on a light background.
const LIGHT_THEME: ITheme = {
  background: "#f1f3f7",
  foreground: "#111827",
  black: "#111827",
  red: "#b91c1c",
  green: "#166534",
  yellow: "#854d0e",
  blue: "#1d4ed8",
  magenta: "#7e22ce",
  cyan: "#155e75",
  white: "#374151",
  brightBlack: "#6b7280",
  brightRed: "#dc2626",
  brightGreen: "#15803d",
  brightYellow: "#a16207",
  brightBlue: "#2563eb",
  brightMagenta: "#9333ea",
  brightCyan: "#0e7490",
  brightWhite: "#111827",
  cursor: "#7e22ce",
  cursorAccent: "#f1f3f7",
  selectionBackground: "#7e22ce29",
};

export function terminalTheme(resolvedTheme: string): ITheme {
  return resolvedTheme === "light" ? LIGHT_THEME : DARK_THEME;
}
