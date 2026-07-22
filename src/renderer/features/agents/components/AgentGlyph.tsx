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

const MARKS: Record<string, (props: { className?: string }) => JSX.Element> = {
  claude: ClaudeMark,
  codex: CodexMark,
};

/** Brand tints, so the two agents stay distinguishable at a glance. */
const TINTS: Record<string, string> = {
  claude: "text-[#D97757]",
  codex: "text-text",
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
