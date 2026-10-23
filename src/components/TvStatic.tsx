import { useEffect, useRef } from "react";

/** Chuvisco de TV: ruído em baixa resolução, ampliado sem suavização. */
export function TvStatic({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = (canvas.width = 160);
    const h = (canvas.height = 90);
    const image = ctx.createImageData(w, h);
    let frame = 0;
    let last = 0;
    const draw = (time: number) => {
      if (time - last > 33) {
        last = time;
        const data = image.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.random() * 255;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} style={{ imageRendering: "pixelated" }} />;
}
