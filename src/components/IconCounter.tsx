import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { GameButton } from "@/components/games/GameButton";

type IconCounterProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Ícone repetido `value` vezes; entram e saem com bounce. */
  icon: ReactNode;
};

/** Rótulo com botões − e +, e abaixo uma fila de ícones que cresce e encolhe com o valor. */
export function IconCounter({ label, value, min, max, onChange, icon }: IconCounterProps) {
  const reduceMotion = useReducedMotion();
  const bounce = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { scale: 0, rotate: -20, opacity: 0 },
        animate: { scale: 1, rotate: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 500, damping: 12 } },
        exit: { scale: 0, rotate: 20, opacity: 0, transition: { duration: 0.14 } },
      };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-game-pixel text-[13px] tracking-[.14em] text-brand-accent uppercase">
          {label} <span className="ml-1 text-white">{value}</span>
        </span>
        <div className="flex gap-2">
          <GameButton
            type="button"
            variant="special"
            size="icon"
            className="size-10 min-h-0 min-w-0"
            aria-label={`Diminuir ${label}`}
            disabled={value <= min}
            onClick={() => onChange(Math.max(min, value - 1))}>
            <Minus />
          </GameButton>
          <GameButton
            type="button"
            variant="info"
            size="icon"
            className="size-10 min-h-0 min-w-0"
            aria-label={`Aumentar ${label}`}
            disabled={value >= max}
            onClick={() => onChange(Math.min(max, value + 1))}>
            <Plus />
          </GameButton>
        </div>
      </div>
      <div className="flex min-h-[40px] flex-wrap gap-1.5" aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          {Array.from({ length: value }).map((_, index) => (
            <motion.span key={index} layout={!reduceMotion} className="inline-flex" {...bounce}>
              {icon}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
