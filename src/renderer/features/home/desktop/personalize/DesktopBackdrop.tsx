import type { RefObject } from "react";

import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";

import { CursorBackdrop } from "./backdrops/CursorBackdrop";
import { GridBackdrop } from "./backdrops/GridBackdrop";
import { PulseBackdrop } from "./backdrops/PulseBackdrop";
import { ShapesBackdrop } from "./backdrops/ShapesBackdrop";
import type { DesktopBackdrop as BackdropId } from "./use-desktop-personalization";

interface DesktopBackdropProps {
	backdrop: BackdropId;
	surface: RefObject<HTMLElement | null>;
}

export function DesktopBackdrop({ backdrop, surface }: Readonly<DesktopBackdropProps>) {
	const { reduceMotion } = useInterfaceSettings();

	switch (backdrop) {
		case "shapes":
			return <ShapesBackdrop />;
		case "grid":
			return <GridBackdrop still={reduceMotion} />;
		case "pulse":
			return <PulseBackdrop still={reduceMotion} />;
		case "cursor":
			return <CursorBackdrop surface={surface} still={reduceMotion} />;
		default:
			return null;
	}
}
