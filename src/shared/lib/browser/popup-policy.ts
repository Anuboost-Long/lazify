/** What the renderer is told about something held back. */
export interface BlockedPopup {
  /** Where it wanted to go. */
  url: string;
  /** The page it was opened from — what an allowance would be granted to. */
  sourceUrl: string;
  /** A popup asked for a window; a redirect tried to steer the page itself. */
  kind: "popup" | "redirect";
}
