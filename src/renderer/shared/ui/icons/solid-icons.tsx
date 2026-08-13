import { useId, type ReactNode, type SVGProps } from "react";

/**
 * Filled counterparts to the iconoir line icons used by the sidebar and the
 * right-hand tool rails.
 *
 * Iconoir ships a `solid` set, but it covers none of these names (folder,
 * code, globe, package, settings, activity, hard-drive, folder-plus,
 * multi-window, journal-page, terminal), so they are drawn by hand on the same
 * 24x24 grid and keep the line icon's silhouette — the active row swaps
 * weight, not shape.
 *
 * Area icons are real fills with their detail cut out via `evenodd`. `code` and
 * `activity` have no interior to fill, so their filled weight is the same
 * stroke drawn heavier, the way line icon sets normally solidify a glyph.
 */

function SolidSvg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      color="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

function StrokeSvg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      color="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Fills `shape`, then cuts the line icon's own detail strokes back out of it.
 *
 * Folder and globe carry lines *inside* their outline — the folder's front-panel
 * lip, the globe's continents — and a plain fill swallows them, which turns the
 * icon into a blob that no longer reads as the same drawing. Masking keeps every
 * line the outline drew, so the active state changes weight and nothing else.
 */
function KnockoutSvg({
  maskName,
  detail,
  children,
  ...props
}: SVGProps<SVGSVGElement> & {
  maskName: string;
  detail: ReactNode;
  children: ReactNode;
}) {
  const maskId = `${maskName}-${useId().replace(/:/g, "")}`;

  return (
    <SolidSvg {...props}>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect x="0" y="0" width="24" height="24" fill="#fff" />
        <g
          fill="none"
          stroke="#000"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {detail}
        </g>
      </mask>
      <g mask={`url(#${maskId})`}>{children}</g>
    </SolidSvg>
  );
}

export function FolderSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <KnockoutSvg maskName="folder-solid" detail={<path d="M2 11H22" />} {...props}>
      <path d="M2.6 4h6.178c.143 0 .282.051.39.144l3.163 2.712c.109.093.248.144.39.144H21.4a.6.6 0 0 1 .6.6v11.8a.6.6 0 0 1-.6.6H2.6a.6.6 0 0 1-.6-.6V4.6a.6.6 0 0 1 .6-.6Z" />
    </KnockoutSvg>
  );
}

export function FolderPlusSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <KnockoutSvg maskName="folder-plus-solid" detail={<path d="M2 11H22" />} {...props}>
      <path d="M2.6 4h6.178c.143 0 .282.051.39.144l3.163 2.712c.109.093.248.144.39.144H14V11h7.4a.6.6 0 0 1 .6.6v7.8a.6.6 0 0 1-.6.6H2.6a.6.6 0 0 1-.6-.6V4.6a.6.6 0 0 1 .6-.6Z" />
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M20 4v4" />
        <path d="M18 6h4" />
      </g>
    </KnockoutSvg>
  );
}

export function MultiWindowSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <KnockoutSvg
      maskName="multi-window-solid"
      detail={
        <>
          <path d="M7 19V11C7 9.89543 7.89543 9 9 9H20C21.1046 9 22 9.89543 22 11V19C22 20.1046 21.1046 21 20 21H9C7.89543 21 7 20.1046 7 19Z" />
          <path d="M10 12H11" />
          <path d="M5 7H6" />
        </>
      }
      {...props}
    >
      <path d="M4 4h11a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 9h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
    </KnockoutSvg>
  );
}

export function JournalPageSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <KnockoutSvg
      maskName="journal-page-solid"
      detail={
        <>
          <path d="M18 2V5.4C18 5.73137 18.2686 6 18.6 6H22" />
          <path d="M6 6L14 6" />
          <path d="M6 10H18" />
          <path d="M13 14L18 14" />
          <path d="M13 18L18 18" />
          <path d="M6 18V14H9V18H6Z" />
        </>
      }
      {...props}
    >
      <path d="M2 21.4V2.6C2 2.26863 2.26863 2 2.6 2H18.2515C18.4106 2 18.5632 2.06321 18.6757 2.17574L21.8243 5.32426C21.9368 5.43679 22 5.5894 22 5.74853V21.4C22 21.7314 21.7314 22 21.4 22H2.6C2.26863 22 2 21.7314 2 21.4Z" />
    </KnockoutSvg>
  );
}

export function TerminalSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <StrokeSvg {...props}>
      <path d="M5 7L10 12L5 17" />
      <path d="M13 17H20" />
    </StrokeSvg>
  );
}

export function CodeSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <StrokeSvg {...props}>
      <path d="M13.5 6 10 18.5" />
      <path d="M6.5 8.5 3 12l3.5 3.5" />
      <path d="M17.5 8.5 21 12l-3.5 3.5" />
    </StrokeSvg>
  );
}

export function GlobeSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <KnockoutSvg
      maskName="globe-solid"
      detail={
        <>
          <path d="M2.5 12.5L8 14.5L7 18L8 21" />
          <path d="M17 20.5L16.5 18L14 17V13.5L17 12.5L21.5 13" />
          <path d="M19 5.5L18.5 7L15 7.5V10.5L17.5 9.5H19.5L21.5 10.5" />
          <path d="M2.5 10.5L5 8.5L7.5 8L9.5 5L8.5 3" />
        </>
      }
      {...props}
    >
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    </KnockoutSvg>
  );
}

export function PackageSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm5.25 0h1.5v5.25h-1.5V4Z"
      />
    </SolidSvg>
  );
}

export function SettingsSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954ZM12 15A3 3 0 1 0 12 9A3 3 0 0 0 12 15Z"
      />
    </SolidSvg>
  );
}

export function ActivitySolid(props: SVGProps<SVGSVGElement>) {
  return (
    <StrokeSvg {...props}>
      <path d="M3 12h3l3-9 6 18 3-9h3" />
    </StrokeSvg>
  );
}

export function HardDriveSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.447 3h13.107a.6.6 0 0 1 .574.428L21.87 12.6H2.13L4.872 3.428A.6.6 0 0 1 5.447 3ZM2.6 13.6h18.8a.6.6 0 0 1 .6.6v6.2a.6.6 0 0 1-.6.6H2.6a.6.6 0 0 1-.6-.6v-6.2a.6.6 0 0 1 .6-.6ZM6 15.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
      />
    </SolidSvg>
  );
}
