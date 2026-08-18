"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PhotoPreview } from "./photo-preview";
import { SceneImage } from "./scene-image";
import { scenes, type Preview } from "./scenes";

export function ProductWindow() {
  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const pointerStart = useRef<number | null>(null);
  const scene = scenes[index];
  const Icon = scene.icon;

  const showScene = (nextIndex: number) =>
    setIndex((nextIndex + scenes.length) % scenes.length);

  useEffect(() => {
    const nextScene = scenes[(index + 1) % scenes.length];
    const preload = new window.Image();
    preload.src = nextScene.image;
  }, [index]);

  return (
    <>
      <section
        className="product-shadow product-showcase relative mx-auto w-full max-w-7xl overflow-hidden rounded-[18px] border border-white/15 bg-[#07100e]"
        aria-label="Explore Lazify features"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") showScene(index - 1);
          if (event.key === "ArrowRight") showScene(index + 1);
        }}
        onPointerDown={(event) => {
          pointerStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const distance = event.clientX - pointerStart.current;
          if (Math.abs(distance) > 48)
            showScene(index + (distance < 0 ? 1 : -1));
          pointerStart.current = null;
        }}
        style={{ "--scene-accent": scene.accent } as React.CSSProperties}
      >
        <div className="flex h-12 items-center border-b border-white/10 bg-black/25 px-4 sm:px-5">
          <div className="flex gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-4 font-display text-xs font-semibold tracking-[.08em] text-stone-300">
            Lazify
          </span>
          <span className="ml-3 hidden font-mono text-[9px] uppercase tracking-[.18em] text-stone-600 sm:inline">
            Interactive workspace tour
          </span>
          <span className="ml-auto font-mono text-[9px] tracking-[.16em] text-stone-500">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(scenes.length).padStart(2, "0")}
          </span>
        </div>

        <div className="showcase-stage relative min-h-[650px] overflow-hidden md:aspect-[16/9] md:min-h-0">
          <div className="absolute inset-0 scale-110 opacity-30">
            <Image
              src={scene.image}
              alt=""
              fill
              draggable={false}
              sizes="100vw"
              className="object-cover blur-3xl"
              aria-hidden="true"
            />
          </div>
          <div className="showcase-vignette absolute inset-0" />
          <div className="showcase-grid absolute inset-0" />

          <div key={scene.id} className="showcase-scene absolute inset-0">
            <SceneImage scene={scene} index={index} onPreview={setPreview} />
            <div
              className="showcase-copy absolute bottom-7 left-5 right-5 z-20 md:bottom-[9%] md:left-[5%] md:right-auto md:w-[32%]"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[var(--scene-accent)]">
                <Icon size={13} strokeWidth={1.6} /> {scene.label}
              </div>
              <h2 className="mt-3 text-balance font-display text-[clamp(1.8rem,3.1vw,3.25rem)] font-semibold leading-[.98] tracking-[-.025em] text-[#f4f3ed]">
                {scene.title}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-stone-300 md:text-[13px] md:leading-6 lg:text-sm">
                {scene.description}
              </p>
            </div>
          </div>

          <div className="absolute bottom-[45%] right-5 z-30 flex items-center gap-2 md:bottom-[8%] md:right-[4%]">
            <button
              type="button"
              className="showcase-control"
              aria-label="Previous feature"
              onClick={() => showScene(index - 1)}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              className="showcase-control"
              aria-label="Next feature"
              onClick={() => showScene(index + 1)}
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-white/10 bg-black/20 px-4 py-3 sm:px-5">
          {scenes.map((item, sceneIndex) => (
            <button
              key={item.id}
              type="button"
              className={clsx(
                "h-1 flex-1 rounded-full transition-colors",
                sceneIndex === index
                  ? "bg-[var(--scene-accent)]"
                  : "bg-white/10 hover:bg-white/20",
              )}
              aria-label={`Show ${item.label}`}
              aria-current={sceneIndex === index ? "true" : undefined}
              onClick={() => showScene(sceneIndex)}
            />
          ))}
          <span className="ml-3 hidden font-mono text-[8px] uppercase tracking-[.16em] text-stone-600 sm:block">
            Swipe or use arrow keys
          </span>
        </div>
      </section>
      {preview ? (
        <PhotoPreview preview={preview} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
