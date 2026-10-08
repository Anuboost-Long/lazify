export interface SwipeProgressEvent {
  direction: "back" | "forward";
  progress: number;
  velocity: number;
  /** Where the fingers are, so the indicator meets them. */
  y: number;
}
