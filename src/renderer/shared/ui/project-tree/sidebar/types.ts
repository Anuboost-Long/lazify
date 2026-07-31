import type { ReactNode } from "react";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

/**
 * One switchable view in the workbench sidebar.
 *
 * The sidebar shell owns the tab strip and nothing else — each view brings its
 * own body and its own header actions, so adding a third view (search, run,
 * extensions) is a matter of appending to an array rather than editing the
 * shell.
 */
export interface SidebarView {
  id: string;
  label: string;
  icon: UiIconName;
  /** Buttons shown at the right of the tab strip while this view is active. */
  actions?: ReactNode;
  content: ReactNode;
}
