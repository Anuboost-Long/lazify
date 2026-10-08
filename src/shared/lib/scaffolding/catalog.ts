/**
 * Where a stack's starter is cloned from. A tag, never a branch: a push to the
 * starter must not change what an existing pin produces. There is no hash here
 * because the starter is cloned rather than downloaded as a file — see
 * `starter-provisioner.ts`.
 */
export interface StarterSource {
  repo: string;
  ref: string;
}
