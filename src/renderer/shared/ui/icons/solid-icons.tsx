import { useId, type ReactNode, type SVGProps } from "react";

/**
 * Filled counterparts to the iconoir line icons used by the sidebar and the
 * right-hand tool rails.
 *
 * Iconoir ships a `solid` set, but it covers none of these names (folder,
 * code, globe, package, settings, activity, hard-drive, folder-plus,
 * multi-window, journal-page, terminal, network, sparks), so they are drawn by
 * hand on the same 24x24 grid and keep the line icon's silhouette — the active row swaps
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

export function KeySolid(props: SVGProps<SVGSVGElement>) {
  return (
    <KnockoutSvg maskName="key-solid" detail={<circle cx="6" cy="12" r="0.6" />} {...props}>
      <path d="M6 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 12h12v3" />
      </g>
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

export function NetworkSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg {...props}>
      <path d="M6.5 6.25a.75.75 0 0 1 .75.75v3.5c0 .69.56 1.25 1.25 1.25h7c.69 0 1.25-.56 1.25-1.25V7a.75.75 0 0 1 1.5 0v3.5a2.75 2.75 0 0 1-2.75 2.75h-2.75V17a.75.75 0 0 1-1.5 0v-3.75H8.5a2.75 2.75 0 0 1-2.75-2.75V7a.75.75 0 0 1 .75-.75Z" />
      <rect x="3" y="2" width="7" height="5" rx="1" />
      <rect x="14" y="2" width="7" height="5" rx="1" />
      <rect x="8.5" y="17" width="7" height="5" rx="1" />
    </SolidSvg>
  );
}

export function SparksSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg {...props}>
      <path d="M15 7.25c.414 0 .75.336.75.75 0 2.277.48 3.775 1.424 4.719.946.946 2.478 1.531 4.826 1.531a.75.75 0 0 1 0 1.5c-2.344 0-3.879.588-4.826 1.535-.948.948-1.424 2.446-1.424 4.715a.75.75 0 0 1-1.5 0c0-2.276-.48-3.774-1.428-4.72-.949-.947-2.488-1.53-4.822-1.53a.75.75 0 0 1 0-1.5c2.334 0 3.873-.58 4.822-1.526.948-.945 1.428-2.443 1.428-4.724 0-.414.336-.75.75-.75Z" />
      <path d="M6.5 1.25c.414 0 .75.336.75.75 0 1.432.3 2.342.85 2.89.55.55 1.482.86 2.9.86a.75.75 0 0 1 0 1.5c-1.418 0-2.35.312-2.9.862-.55.55-.85 1.46-.85 2.888a.75.75 0 0 1-1.5 0c0-1.433-.3-2.343-.852-2.893-.55-.548-1.48-.857-2.898-.857a.75.75 0 0 1 0-1.5c1.418 0 2.347-.308 2.898-.855.552-.549.852-1.46.852-2.895 0-.414.336-.75.75-.75Z" />
    </SolidSvg>
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

/**
 * The wrench, filled.
 *
 * Its two paths at their own coordinates: the handle is an open line, so it
 * stays a stroke and only grows heavier — filling it would close it across its
 * own ends and lay a sliver over the head. The head encloses an area, so it
 * fills, and its jaw stays open because the outline dips into it.
 */
export function ToolsSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        fill="none"
        strokeWidth={2.8}
        d="M10.0503 10.6066L2.97923 17.6777C2.19818 18.4587 2.19818 19.725 2.97923 20.5061V20.5061C3.76027 21.2871 5.0266 21.2871 5.80765 20.5061L12.8787 13.435"
      />
      <path d="M10.0502 10.6066C9.20638 8.45358 9.37134 5.6286 11.1109 3.88909C12.8504 2.14957 16.0606 1.76777 17.8284 2.82843L14.7877 5.8691L14.5051 8.98014L17.6161 8.69753L20.6568 5.65685C21.7175 7.42462 21.3357 10.6349 19.5961 12.3744C17.8566 14.1139 15.0316 14.2789 12.8786 13.435Z" />
    </SolidSvg>
  );
}

/**
 * The line icon's own outline, filled.
 *
 * The house is a closed path, so it fills as it stands; the threshold line is
 * punched back out with `evenodd` rather than drawn over, which keeps it
 * visible whatever colour the icon takes.
 */
export function HomeSolid(props: SVGProps<SVGSVGElement>) {
  return (
    <SolidSvg {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 21H7C4.79086 21 3 19.2091 3 17V10.7076C3 9.30887 3.73061 8.01175 4.92679 7.28679L9.92679 4.25649C11.2011 3.48421 12.7989 3.48421 14.0732 4.25649L19.0732 7.28679C20.2694 8.01175 21 9.30887 21 10.7076V17C21 19.2091 19.2091 21 17 21ZM9 16.15h6a.85.85 0 0 1 0 1.7H9a.85.85 0 0 1 0-1.7Z"
      />
    </SolidSvg>
  );
}
