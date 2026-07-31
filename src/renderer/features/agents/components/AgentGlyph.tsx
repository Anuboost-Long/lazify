import clsx from "clsx";

import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * Brand marks for the agents in the registry.
 *
 * Kept renderer-side (the main-process registry stays free of presentation) and
 * keyed by agent id, with a generic fallback so a newly registered agent still
 * renders something sensible before it gets artwork.
 */

interface AgentGlyphProps {
  agentId: string;
  className?: string;
  /** Icon (data URL) for a custom agent; wins over the built-in brand marks. */
  image?: string;
}

/** Anthropic's radiating burst. */
function ClaudeMark({ className }: Readonly<{ className?: string }>) {
  // Ray angles and inner radii, mirrored across the vertical axis.
  const rays = [
    { angle: -90, inner: 2.4 },
    { angle: -55, inner: 3.2 },
    { angle: -20, inner: 3.2 },
    { angle: 20, inner: 3.2 },
    { angle: 55, inner: 3.2 },
    { angle: 90, inner: 2.4 },
    { angle: 125, inner: 3.2 },
    { angle: 160, inner: 3.2 },
    { angle: -160, inner: 3.2 },
    { angle: -125, inner: 3.2 },
  ];

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {rays.map(({ angle, inner }) => {
        const radians = (angle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return (
          <line
            key={angle}
            x1={12 + cos * inner}
            y1={12 + sin * inner}
            x2={12 + cos * 9.4}
            y2={12 + sin * 9.4}
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/**
 * OpenAI's hexagonal knot, simplified to nested hexagons.
 * Deliberately not the three-ellipse rosette — that reads as the React logo,
 * which already appears in this app as a stack label.
 */
function CodexMark({ className }: Readonly<{ className?: string }>) {
  const hexagon = (radius: number, offsetDegrees: number) =>
    [0, 1, 2, 3, 4, 5]
      .map((step) => {
        const radians = ((step * 60 + offsetDegrees - 90) * Math.PI) / 180;
        return `${12 + Math.cos(radians) * radius},${12 + Math.sin(radians) * radius}`;
      })
      .join(" ");

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points={hexagon(8.8, 0)}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <polygon
        points={hexagon(4.3, 30)}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gemini's four-pointed spark, drawn as two crossed curves. */
function GeminiMark({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.5c0 5.1 4.4 9.5 9.5 9.5-5.1 0-9.5 4.4-9.5 9.5 0-5.1-4.4-9.5-9.5-9.5 5.1 0 9.5-4.4 9.5-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A pilot's visor: enough to read as Copilot without copying the mark. */
function CopilotMark({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="3"
        y="7.5"
        width="18"
        height="11"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 4.5c1.6 1.4 6.4 1.4 8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="13" r="1.4" fill="currentColor" />
      <circle cx="15" cy="13" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** The pointer the editor is named for. */
function CursorMark({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.5 3.2 19 11.4l-5.9 1.5-2.4 5.7L5.5 3.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MARKS: Record<string, (props: { className?: string }) => JSX.Element> = {
  claude: ClaudeMark,
  codex: CodexMark,
  gemini: GeminiMark,
  copilot: CopilotMark,
  cursor: CursorMark,
};

/** Brand tints, so the agents stay distinguishable at a glance. */
const TINTS: Record<string, string> = {
  claude: "text-[#D97757]",
  codex: "text-text",
  gemini: "text-[#4285F4]",
  copilot: "text-text",
  cursor: "text-text",
};

export function AgentGlyph({ agentId, className, image }: Readonly<AgentGlyphProps>) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={clsx("h-4 w-4 rounded-[5px] object-cover", className)}
      />
    );
  }

  const Mark = MARKS[agentId];

  if (!Mark) {
    return <UiIcon name="code" className={clsx("h-4 w-4", className)} />;
  }

  return <Mark className={clsx("h-4 w-4", TINTS[agentId], className)} />;
}
