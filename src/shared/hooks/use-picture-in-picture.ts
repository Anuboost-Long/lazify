import { useCallback, useEffect, useState } from "react";

/**
 * The page half of picture-in-picture: the floating always-on-top window main
 * owns, from the point of view of a toolbar button.
 *
 * There is one such window for the whole app, so this reads main's state rather
 * than keeping its own — two surfaces with a button each must not disagree about
 * whether the floater is open, and the user closing it from its own title bar
 * has to be heard too.
 */
export function usePictureInPicture(source: "preview" | "browser") {
  const [open, setOpen] = useState(false);

  // "On" means this surface owns the window — the preview's button must not
  // light up for a page the browser floated. Read once on mount so whichever
  // surface mounts second is still right, then followed live: a close from the
  // window's own chrome, or another surface taking it over, both land here.
  useEffect(() => {
    void globalThis.lazify
      .getPictureInPictureState()
      .then((state) => setOpen(state.open && state.source === source));

    return globalThis.lazify.onPictureInPictureChanged((state) =>
      setOpen(state.open && state.source === source)
    );
  }, [source]);

  /** Opens the floater on `url`, or closes it when it is already showing. */
  const toggle = useCallback(
    async (url: string | null) => {
      if (open || !url) {
        const state = await globalThis.lazify.closePictureInPicture();
        setOpen(state.open && state.source === source);
        return;
      }

      const state = await globalThis.lazify.openPictureInPicture(url, source);
      setOpen(state.open && state.source === source);
    },
    [open, source]
  );

  return { open, toggle };
}
