export interface CaretBox {
  left: number;
  top: number;
  lineHeight: number;
}

const COPIED = [
  "boxSizing",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRightWidth",
  "borderTopWidth",
  "textIndent",
  "textTransform",
  "wordSpacing"
] as const;

export function caretBoxOf(field: HTMLTextAreaElement): CaretBox {
  try {
    return measure(field);
  } catch {
    return { left: 0, top: 0, lineHeight: 20 };
  }
}

function measure(field: HTMLTextAreaElement): CaretBox {
  const computed = globalThis.getComputedStyle(field);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");

  for (const property of COPIED) mirror.style[property] = computed[property];

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.width = `${field.clientWidth}px`;
  mirror.style.height = "auto";
  mirror.style.overflow = "hidden";
  mirror.style.whiteSpace = computed.whiteSpace === "pre" ? "pre" : "pre-wrap";
  mirror.style.overflowWrap = computed.overflowWrap;
  mirror.textContent = field.value.slice(0, field.selectionStart);
  marker.textContent = field.value.slice(field.selectionStart) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
  const box = {
    left: finite(marker.offsetLeft - field.scrollLeft, 0),
    top: finite(marker.offsetTop - field.scrollTop, 0),
    lineHeight:
      Number.parseFloat(computed.lineHeight) ||
      Number.parseFloat(computed.fontSize) * 1.4 ||
      20
  };

  mirror.remove();

  return box;
}
