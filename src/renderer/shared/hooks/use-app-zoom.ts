import { atom, useAtom } from "jotai";
import { useEffect } from "react";

const zoomAtom = atom(1);

export function useAppZoom() {
  const [zoom, setZoom] = useAtom(zoomAtom);

  useEffect(() => {
    void globalThis.lazify.readZoom().then(setZoom).catch(() => undefined);

    return globalThis.lazify.onZoomChanged(setZoom);
  }, []);

  return {
    zoom,
    zoomIn: () => void globalThis.lazify.stepZoom(1).then(setZoom).catch(() => undefined),
    zoomOut: () => void globalThis.lazify.stepZoom(-1).then(setZoom).catch(() => undefined),
    resetZoom: () => void globalThis.lazify.resetZoom().then(setZoom).catch(() => undefined)
  };
}
