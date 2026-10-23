import type { CSSProperties, ReactNode } from "react";

import { TvStatic } from "@/components/TvStatic";

/** Moldura de TV neon: tela em pixel com chuvisco e scanlines; os controles ficam no painel abaixo da tela. */
export function TvFrame({
  screen,
  controls,
  staticActive = false,
  color = "#ff2e93",
  className = "",
}: {
  screen: ReactNode;
  controls: ReactNode;
  staticActive?: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto flex w-full max-w-[900px] px-1 flex-col items-center ${className}`} style={{ "--neon-c": color } as CSSProperties}>
      <div aria-hidden="true" className="relative h-9 w-24">
        <span className="absolute bottom-0 left-3 h-9 w-[3px] origin-bottom -rotate-[28deg] bg-(--neon-c) shadow-[0_0_8px_var(--neon-c)]" />
        <span className="absolute right-3 bottom-0 h-9 w-[3px] origin-bottom rotate-[28deg] bg-(--neon-c) shadow-[0_0_8px_var(--neon-c)]" />
      </div>
      <div className="neon-box w-full rounded-[22px] bg-[color-mix(in_srgb,var(--neon-c)_14%,#0a0618)] p-8 max-[420px]:p-3">
        <div className="@container tv-scanlines relative aspect-video min-h-[260px] w-full overflow-hidden rounded-[14px] border-4 border-black bg-[#05030c] font-game-pixel shadow-[inset_0_0_40px_rgba(0,0,0,.9),0_0_0_2px_color-mix(in_srgb,var(--neon-c)_60%,transparent)] [image-rendering:pixelated] max-[760px]:aspect-auto max-[760px]:min-h-[300px]">
          <div className="absolute inset-0 z-0">{screen}</div>
          {staticActive && <TvStatic className="absolute inset-0 z-[4] size-full" />}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span aria-hidden="true" className="flex items-center gap-2 font-game-pixel text-[10px] tracking-[.1em] text-white/70 uppercase">
            <i className="blink size-2.5 rounded-full bg-(--neon-c) shadow-[0_0_8px_var(--neon-c)]" /> On
          </span>
          <div className="flex flex-1 flex-col items-center gap-2">{controls}</div>
          <span aria-hidden="true" className="flex gap-1.5">
            <i className="size-4 rounded-full border-2 border-(--neon-c) bg-black/50" />
            <i className="size-4 rounded-full border-2 border-(--neon-c) bg-black/50" />
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="flex w-[78%] justify-between">
        <span className="h-2.5 w-10 rounded-b bg-(--neon-c) shadow-[0_0_8px_var(--neon-c)]" />
        <span className="h-2.5 w-10 rounded-b bg-(--neon-c) shadow-[0_0_8px_var(--neon-c)]" />
      </div>
    </div>
  );
}
