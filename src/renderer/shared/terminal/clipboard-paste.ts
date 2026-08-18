import type { Terminal } from "@xterm/xterm";

/**
 * xterm's own paste handling relies on the browser firing a native "paste"
 * event against its off-screen helper textarea, which is unreliable in Chromium
 * on Windows (macOS's text-input responder chain is more forgiving of a
 * programmatically-focused, near-invisible field). Reading the clipboard
 * directly sidesteps that native event entirely, so paste works the same way on
 * every platform.
 */
export function attachClipboardPaste(container: HTMLElement, term: Terminal) {
  // A copied screenshot has no text representation, so check for an image
  // first — otherwise it would paste as nothing at all. Saved to disk and
  // pasted as a path, the agent can open it with its own file-reading tools the
  // same way it would a path the user typed.
  const pasteFromClipboard = () => {
    void globalThis.lazify.saveClipboardImage().then((imagePath) => {
      if (imagePath) {
        term.paste(`"${imagePath}"`);
        return;
      }

      void navigator.clipboard.readText().then((text) => {
        if (text) term.paste(text);
      });
    });
  };

  const handlePasteShortcut = (event: KeyboardEvent) => {
    const isPasteShortcut =
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "v";

    if (!isPasteShortcut) return;

    event.preventDefault();
    // xterm's own textarea keydown handler stops propagation for keys it
    // recognizes (including Ctrl+V) before a bubble-phase listener would ever
    // see them, so this has to run in the capture phase to get there first —
    // and stop it here too, so xterm doesn't also process the key.
    event.stopPropagation();
    pasteFromClipboard();
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    pasteFromClipboard();
  };

  container.addEventListener("keydown", handlePasteShortcut, true);
  container.addEventListener("contextmenu", handleContextMenu);

  return () => {
    container.removeEventListener("keydown", handlePasteShortcut, true);
    container.removeEventListener("contextmenu", handleContextMenu);
  };
}
