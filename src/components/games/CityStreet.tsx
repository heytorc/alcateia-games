import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { Link } from "react-router-dom";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { applyInertia, cameraFor, clampCamera, GROUND_Y, layoutLots, SCENE_H } from "@/lib/city-scene";
import { buildLayers, drawFrame, type CityLayers } from "@/components/games/city-draw";

const DRAG_THRESHOLD = 6;
/** Contornos da placa de pernas neon da boate (viewBox 100×72): a perna dobrada sobe e desce, a outra fica esticada. */
const LEGS_STRETCHED = "M6 62 C20 62 34 62 46 63 C54 63 60 64 66 66 C72 68 76 66 80 67 C82 70 84 70 88 70 C92 70 96 69 98 68";
const LEGS_POSES = {
  up: [
    "M12 56 C20 40 32 22 42 14 C44 12 46 13 47 16 C49 26 51 40 51 50 C52 55 57 58 63 61 C66 62 66 64 63 64",
    "M24 58 C30 46 36 34 41 25 C38 32 39 40 42 46 C44 50 44 53 43 56 C43 60 46 63 51 63 C55 64 59 64 62 64",
    "M56 51 C64 55 72 58 80 61 C86 63 92 65 98 67",
  ],
  down: [
    "M12 56 C22 46 36 34 48 27 C50 26 52 27 53 29 C56 38 58 45 60 51 C62 55 67 58 73 61 C76 62 76 64 73 64",
    "M24 58 C32 50 40 42 47 35 C46 41 48 46 51 50 C53 53 53 55 53 57 C53 61 56 63 61 63 C65 64 69 64 72 64",
    "M66 56 C72 58 76 60 80 61 C86 63 92 65 98 67",
  ],
};

function NeonLegs({ lotH }: { lotH: number }) {
  const tube = (d: string) => (
    <g key={d}>
      <path d={d} className="stroke-[#ff3fa4] [stroke-width:3]" />
      <path d={d} className="stroke-[#ffd6ec] [stroke-width:1.2]" />
    </g>
  );
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 72"
      className="neon-legs pointer-events-none absolute"
      style={{ left: 12, top: lotH - 98, width: 58, height: 42 }}>
      {tube(LEGS_STRETCHED)}
      <g className="neon-legs-up">{LEGS_POSES.up.map(tube)}</g>
      <g className="neon-legs-down">{LEGS_POSES.down.map(tube)}</g>
    </svg>
  );
}

/**
 * Rua neon dos anos 80 em 2.5D: cenário em canvas com parallax e um link por jogo
 * sobre a fachada. Arrastar (ou rolar na horizontal) percorre a rua; Tab foca os jogos.
 */
export function CityStreet() {
  const { lots, worldW } = useMemo(layoutLots, []);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [hint, setHint] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const view = useRef({ scale: 1, viewW: 320 });
  const cam = useRef({ x: 0, v: 0, target: null as number | null });
  const drag = useRef<{ id: number; startX: number; lastX: number; lastT: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const root = rootRef.current!;
    const canvasEl = canvasRef.current!;
    const ctx = canvasEl.getContext("2d")!;
    let layers: CityLayers = buildLayers(lots, worldW);
    let cancelled = false;
    document.fonts?.load("8px Silkscreen").then(() => {
      if (!cancelled) layers = buildLayers(lots, worldW);
    });

    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      const scale = height / SCENE_H;
      const viewW = Math.ceil(width / scale);
      view.current = { scale, viewW };
      canvasEl.width = viewW;
      canvasEl.height = SCENE_H;
      canvasEl.style.width = `${viewW * scale}px`;
      canvasEl.style.height = `${height}px`;
      ctx.imageSmoothingEnabled = false;
      cam.current.x = clampCamera(cam.current.x, viewW, worldW);
      if (worldW <= viewW) setHint(false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const c = cam.current;
      const { scale, viewW } = view.current;
      const reduced = reducedRef.current;
      if (!drag.current?.moved) {
        if (c.target !== null) {
          c.x = reduced ? c.target : c.x + (c.target - c.x) * Math.min(1, dt / 110);
          if (Math.abs(c.target - c.x) < 0.3) [c.x, c.target] = [c.target, null];
        } else if (c.v) {
          const next = clampCamera(c.x + c.v * dt, viewW, worldW);
          c.v = next === c.x + c.v * dt ? applyInertia(c.v, dt) : 0;
          c.x = next;
        }
      }
      drawFrame(ctx, layers, lots, c.x, viewW, now, !reduced);
      layerRef.current!.style.transform = `translate3d(${-c.x * scale}px,0,0) scale(${scale})`;
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    const resume = () => {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", resume);
    raf = requestAnimationFrame(frame);

    const onWheel = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!horizontal) return;
      e.preventDefault();
      const c = cam.current;
      c.target = null;
      c.v = 0;
      c.x = clampCamera(c.x + (e.deltaX || e.deltaY) / view.current.scale, view.current.viewW, worldW);
      setHint(false);
    };
    root.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", resume);
      root.removeEventListener("wheel", onWheel);
    };
  }, [lots, worldW]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: e.timeStamp, moved: false };
    cam.current.v = 0;
    cam.current.target = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < DRAG_THRESHOLD) return;
      d.moved = true;
      rootRef.current!.setPointerCapture(e.pointerId);
      setHint(false);
    }
    const { scale, viewW } = view.current;
    const dx = (e.clientX - d.lastX) / scale;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    const c = cam.current;
    c.x = clampCamera(c.x - dx, viewW, worldW);
    c.v = 0.8 * (-dx / dt) + 0.2 * c.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };
  const endDrag = (e: React.PointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    suppressClick.current = true;
    if (cancelled || reducedMotion || e.timeStamp - d.lastT > 80) cam.current.v = 0;
  };

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Rua dos jogos: arraste para os lados ou use Tab para escolher um jogo"
      className="relative h-[280px] touch-pan-y overflow-hidden bg-[#04020c] select-none min-[760px]:h-[360px]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      onClickCapture={(e) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}>
      <canvas ref={canvasRef} aria-hidden className="block [image-rendering:pixelated]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
      <div
        ref={layerRef}
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: worldW, height: SCENE_H }}>
        {lots.map((lot) => (
          <Link
            key={lot.id}
            to={`/${lot.id}`}
            draggable={false}
            aria-label={`${lot.title}. ${lot.description}`}
            className="group absolute rounded-[2px] outline-none focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-(--lot-c)"
            style={{ left: lot.x, top: GROUND_Y - lot.h, width: lot.w, height: lot.h + 12, "--lot-c": lot.color } as CSSProperties}
            onFocus={(e) => {
              if (!e.currentTarget.matches(":focus-visible")) return;
              const { viewW } = view.current;
              cam.current.v = 0;
              cam.current.target = cameraFor(lot, viewW, worldW);
            }}>
            {lot.kind === "boate" && <NeonLegs lotH={lot.h} />}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[1px] border-[0.5px] border-(--lot-c) bg-[#0a0618] px-1 py-px font-game-pixel text-[6px] shadow-[0_0_4px_var(--lot-c)] leading-none whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              // acima do lote, mas sem sair pelo topo da cena nos prédios mais altos
              style={{ top: Math.max(-10, 2 - (GROUND_Y - lot.h)) }}>
              ▶ {lot.title}
            </span>
          </Link>
        ))}
      </div>
      {hint && (
        <div
          aria-hidden
          className="blink pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-game-pixel text-[10px] tracking-[.3em] text-brand-gold [text-shadow:0_0_8px_#ffe14a]">
          ◀ ARRASTE ▶
        </div>
      )}
    </div>
  );
}
