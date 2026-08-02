import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatSize } from "../utils/format-size";
import { StatusTile } from "./StatusTile";

interface AppStatusTilesProps {
  sizeBytes: number;
}

/**
 * About the image that will come out, not the app that went in.
 *
 * The header already identifies the app three ways over, and what the user
 * cannot see anywhere else is what they are about to produce.
 */
export function AppStatusTiles({ sizeBytes }: AppStatusTilesProps) {
  const { t } = useTranslation();

  return (
    <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
      <StatusTile
        icon="package"
        label={translation.DmgCompiler.TileSize}
        value={formatSize(sizeBytes)}
        delayMs={0}
      />
      <StatusTile
        icon="hard-drive"
        label={translation.DmgCompiler.TileFormat}
        value="UDZO · HFS+"
        delayMs={60}
      />
      <StatusTile
        icon="folder"
        label={translation.DmgCompiler.TileLayout}
        value={t(translation.DmgCompiler.LayoutValue)}
        mono={false}
        delayMs={120}
      />
    </div>
  );
}
