import type { ReactNode } from "react";

import { PageActions } from "@renderer/app/components/PageChrome";
import type { ToolDefinition } from "../catalog";
import { ToolCrumb } from "./ToolCrumb";

interface ToolPageHeaderProps {
  tool: ToolDefinition;
  /** Anything the tool wants in the top bar — a picker, a switch. */
  children?: ReactNode;
}

/**
 * A tool's chrome, all of it in the shell's top bar.
 *
 * The page draws no title of its own: the breadcrumb already names it, and the
 * root crumb is what leads back out — the same navigation every other page in
 * the app uses.
 */
export function ToolPageHeader({ tool, children }: Readonly<ToolPageHeaderProps>) {
  return (
    <>
      <ToolCrumb tool={tool} />
      {children ? <PageActions>{children}</PageActions> : null}
    </>
  );
}
