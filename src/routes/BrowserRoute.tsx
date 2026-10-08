/**
 * The browser page has no body of its own.
 *
 * Its surface is mounted by the shell rather than by this route, so that it
 * survives navigating away — otherwise leaving the page would unmount the
 * webviews and stop whatever they were playing. This route exists to give the
 * page a URL and a sidebar entry; the shell paints over it.
 */
export function BrowserRoute() {
  return null;
}
