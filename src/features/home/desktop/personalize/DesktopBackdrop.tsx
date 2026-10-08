import type { RefObject } from "react";

import { useInterfaceSettings } from "@/shared/hooks/use-interface-settings";
import { RainWater } from "@/shared/ui/rain-water/RainWater";

import { CursorBackdrop } from "./backdrops/CursorBackdrop";
import { GridBackdrop } from "./backdrops/GridBackdrop";
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
		case "cursor":
			return <CursorBackdrop surface={surface} still={reduceMotion} />;
		case "rain":
			return <RainWater still={reduceMotion} />;
		default:
			return null;
	}
}
