import clsx from "clsx";
import Image from "next/image";
import { SceneDetails } from "./scene-details";
import type { Preview, Scene } from "./scenes";
import { TemplateImages } from "./template-images";

export function SceneImage({
  scene,
  index,
  onPreview,
}: Readonly<{
  scene: Scene;
  index: number;
  onPreview: (preview: Preview) => void;
}>) {
  return (
    <div className={clsx("showcase-visual", `showcase-visual-${scene.id}`)}>
      {scene.id === "templates" ? (
        <TemplateImages scene={scene} onPreview={onPreview} />
      ) : (
        <button
          type="button"
          className="showcase-image-frame showcase-preview-trigger"
          aria-label={`Preview ${scene.label} screenshot`}
          onClick={() => onPreview({ src: scene.image, alt: scene.alt })}
        >
          <Image
            src={scene.image}
            alt={scene.alt}
            fill
            draggable={false}
            priority={index === 0}
            sizes="(min-width: 1280px) 900px, (min-width: 768px) 68vw, 92vw"
          />
        </button>
      )}
      <SceneDetails id={scene.id} />
    </div>
  );
}
