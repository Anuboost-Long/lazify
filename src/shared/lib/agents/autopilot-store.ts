/**
 * Whether autopilot may answer prompts, and where.
 *
 * Off until the user turns it on, and stored rather than remembered: a feature
 * that types into a terminal has to be something the user switched on
 * deliberately, and it must not come back on by itself after a crash.
 *
 * The per-project list is an opt-*out*. Someone who enables autopilot wants it
 * across the projects they have open — that is the whole complaint it answers —
 * but there is usually one repo that is different, and that repo needs a switch
 * of its own rather than a reason to turn the feature off everywhere.
 */

export interface AutopilotSettings {
  enabled: boolean;
  /** Project paths autopilot leaves alone while it is on elsewhere. */
  excludedProjects: string[];
}
