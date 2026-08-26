import { sonarlintEngine } from "./sonarlint";
import { tailwindEngine } from "./tailwind";
import type { LintEngine } from "./types";

export const ENGINES: readonly LintEngine[] = [sonarlintEngine, tailwindEngine];

export const disposeLanguageServers = () => ENGINES.forEach((engine) => engine.dispose?.());

export { projectRootFor } from "./project-root";
export type { LintEngine, LintEngineRequest, LintEngineResult } from "./types";
