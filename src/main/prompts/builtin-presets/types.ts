export interface BuiltinPreset {
  id: string;
  name: string;
  description: string;
  template: string;
  sortOrder: number;
}

/**
 * The tail every preset ends with.
 *
 * Context, rules and preset text are all generic by nature; the task is the one
 * part written for this job. Saying so in the prompt is what stops a preset's
 * "prefer the smallest change" from quietly outranking "rewrite this module".
 */
export const PRECEDENCE = `Where these instructions conflict, the task above takes precedence.`;
