import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";
import type { Preview, Scene } from "./scenes";

export function TemplateImages({
  scene,
  onPreview,
}: Readonly<{
  scene: Extract<Scene, { id: "templates" }>;
  onPreview: (preview: Preview) => void;
}>) {
  const [view, setView] = useState<"composer" | "library">("composer");

  const selectOrPreview = (
    nextView: "composer" | "library",
    preview: Preview,
  ) => {
    if (view === nextView) {
      onPreview(preview);
      return;
    }

    setView(nextView);
  };

  return (
    <>
      <button
        type="button"
        className={clsx(
          "showcase-secondary-frame showcase-template-frame",
          view === "library" && "showcase-template-frame-active",
        )}
        aria-label={
          view === "library"
            ? "Preview saved templates"
            : "Select saved templates"
        }
        aria-pressed={view === "library"}
        onClick={() =>
          selectOrPreview("library", {
            src: scene.secondaryImage,
            alt: scene.secondaryAlt,
          })
        }
      >
        <Image
          src={scene.secondaryImage}
          alt={scene.secondaryAlt}
          fill
          draggable={false}
          sizes="(min-width: 768px) 44vw, 82vw"
        />
        {view !== "library" ? (
          <span className="showcase-template-action">
            <span>Saved templates</span>
            <strong>View library</strong>
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className={clsx(
          "showcase-image-frame showcase-template-frame",
          view === "composer" && "showcase-template-frame-active",
        )}
        aria-label={
          view === "composer"
            ? "Preview template composer"
            : "Select template composer"
        }
        aria-pressed={view === "composer"}
        onClick={() =>
          selectOrPreview("composer", { src: scene.image, alt: scene.alt })
        }
      >
        <Image
          src={scene.image}
          alt={scene.alt}
          fill
          draggable={false}
          priority
          sizes="(min-width: 1280px) 900px, (min-width: 768px) 68vw, 92vw"
        />
        {view !== "composer" ? (
          <span className="showcase-template-action">
            <span>Template composer</span>
            <strong>View composer</strong>
          </span>
        ) : null}
      </button>
    </>
  );
}
