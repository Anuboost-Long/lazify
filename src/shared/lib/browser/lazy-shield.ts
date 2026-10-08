export interface LazyShieldState {
  enabled: boolean;
  /** False until the engine has been built, which the first enable awaits. */
  ready: boolean;
  blocked: number;
}
