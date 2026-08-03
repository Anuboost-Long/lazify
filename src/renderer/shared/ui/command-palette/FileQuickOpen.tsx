import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type {
  FileSearchEntry,
  FileSearchResult,
} from "@renderer/shared/lib/fuzzy/file-search";
import { CaptionText, MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual } from "@renderer/shared/ui/project-tree-optimized/tree-utils-editable";
import { CommandPalette, HighlightedText } from "./CommandPalette";
import { useFileQuickOpen, type QuickOpenTreeNode } from "./useFileQuickOpen";

interface FileQuickOpenProps {
  tree: readonly QuickOpenTreeNode[];
  /** Opens the picked file — typically the adapter's select-by-node. */
  onOpenFile: (entry: FileSearchEntry) => void;
}

/** Splits the path's matched positions into the directory part and the name. */
function splitMatch(result: FileSearchResult) {
  const { path, name } = result.entry;
  const nameStart = path.length - name.length;
  const dir = path.slice(0, nameStart);

  const dirPositions: number[] = [];
  const namePositions: number[] = [];
  for (const position of result.positions) {
    if (position < nameStart) dirPositions.push(position);
    else namePositions.push(position - nameStart);
  }

  return { dir, name, dirPositions, namePositions };
}

/**
 * File quick-open: the Cmd/Ctrl+P palette bound to the project tree. Thin glue
 * over the generic CommandPalette — it only turns ranked file results into
 * rows and forwards a pick back to the tree.
 */
export function FileQuickOpen({ tree, onOpenFile }: Readonly<FileQuickOpenProps>) {
  const { t } = useTranslation();
  const quickOpen = useFileQuickOpen(tree, onOpenFile);

  return (
    <CommandPalette<FileSearchResult>
      open={quickOpen.open}
      query={quickOpen.query}
      placeholder={t(translation.CommandPalette.SearchFilesPlaceholder)}
      emptyLabel={t(translation.CommandPalette.NoMatchingFiles)}
      items={quickOpen.results}
      getKey={(result) => result.entry.id}
      onQueryChange={quickOpen.setQuery}
      onSelect={(result) => quickOpen.select(result.entry)}
      onClose={quickOpen.close}
      renderItem={(result) => {
        const { dir, name, dirPositions, namePositions } = splitMatch(result);
        const visual = getFileVisual(name);

        return (
          <>
            <UiIcon name={visual.icon} className={`h-4 w-4 shrink-0 ${visual.color}`} />
            <MonoText as="span" className="shrink-0 truncate text-sm text-text">
              <HighlightedText text={name} positions={namePositions} />
            </MonoText>
            {dir ? (
              <CaptionText as="span" tone="muted" className="min-w-0 flex-1 truncate text-xs">
                <HighlightedText
                  text={dir}
                  positions={dirPositions}
                  matchClassName="text-accent/80"
                />
              </CaptionText>
            ) : null}
          </>
        );
      }}
    />
  );
}
