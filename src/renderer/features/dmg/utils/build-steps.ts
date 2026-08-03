import { translation } from "@renderer/i18n/translation";

/** The build, as the user watches it happen. In the order the main process runs. */
export const BUILD_STEPS = [
  { step: "staging", label: translation.DmgCompiler.StepStaging },
  { step: "styling", label: translation.DmgCompiler.StepStyling },
  { step: "compressing", label: translation.DmgCompiler.StepCompressing }
] as const;

/**
 * Which segment of the track is running.
 *
 * `done` arrives with the result, by which point the track is gone — so it maps
 * onto the last segment rather than off the end of the list.
 */
export function buildStepIndex(step: string): number {
  return Math.max(
    0,
    BUILD_STEPS.findIndex((entry) => entry.step === step)
  );
}
