import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useReducedMotion } from "motion/react";

const STEP_DEG = 45;
const DRAG_THRESHOLD_DEG = 18;

type ChannelKnobProps = {
  /** Chamado a cada giro completo (clique, toque, arrasto ou teclado). */
  onTurn: () => void;
  disabled?: boolean;
  label?: string;
};

/** Seletor de canais rotativo das TVs antigas: gire (ou toque) e ele avança um canal com "clique" mecânico. */
export function ChannelKnob({ onTurn, disabled = false, label = "Girar o seletor de canais para sortear a rodada" }: ChannelKnobProps) {
  const reduceMotion = useReducedMotion();
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startAngle: number; baseAngle: number; moved: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const pointerAngle = (event: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return (Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
  };

  const turn = (direction = 1) => {
    if (disabled) return;
    setAngle((current) => current + STEP_DEG * direction);
    onTurn();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (disabled) return;
    ref.current?.setPointerCapture(event.pointerId);
    drag.current = { startAngle: pointerAngle(event), baseAngle: angle, moved: 0 };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (!current) return;
    let delta = pointerAngle(event) - current.startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    current.moved = delta;
    setAngle(current.baseAngle + delta);
  };

  const onPointerUp = () => {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (!current) return;
    if (Math.abs(current.moved) < DRAG_THRESHOLD_DEG) {
      setAngle(current.baseAngle);
      turn(1);
      return;
    }
    // arrasto: encaixa no próximo "clique" na direção em que girou
    const direction = current.moved > 0 ? 1 : -1;
    setAngle(current.baseAngle + STEP_DEG * direction);
    onTurn();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      turn(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      turn(-1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`relative size-[84px] touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-(--neon-cyan) focus-visible:ring-offset-2 focus-visible:ring-offset-background ${disabled ? "cursor-default opacity-60" : "cursor-grab active:cursor-grabbing"}`}>
        {/* marcas de canal ao redor */}
        {Array.from({ length: 8 }).map((_, index) => (
          <i
            key={index}
            aria-hidden="true"
            className="absolute top-0 left-1/2 h-2.5 w-[3px] -translate-x-1/2 origin-[50%_42px] rounded-full bg-(--neon-c) opacity-80 shadow-[0_0_6px_var(--neon-c)]"
            style={{ transform: `translateX(-50%) rotate(${index * STEP_DEG}deg)` }}
          />
        ))}
        {/* botão giratório */}
        <div
          className="absolute inset-[11px] rounded-full border-2 border-(--neon-c) bg-[radial-gradient(circle_at_35%_30%,#3a2a80,#0a0618_70%)] shadow-[0_0_14px_var(--neon-c),inset_0_0_12px_rgba(0,0,0,.8)] will-change-transform"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: dragging || reduceMotion ? "none" : "transform .32s cubic-bezier(.3,1.6,.5,1)",
          }}>
          <span aria-hidden="true" className="absolute top-[5px] left-1/2 h-[14px] w-[4px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
          <span aria-hidden="true" className="absolute inset-[16px] rounded-full border border-white/15" />
        </div>
      </div>
      <span aria-hidden="true" className="font-game-pixel text-[9px] tracking-[.14em] text-white/70 uppercase">Canal</span>
    </div>
  );
}
