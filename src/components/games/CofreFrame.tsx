import { Delete, Unlock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { LedDigit, type LedTone } from "@/components/games/LedDigits";

export type CofreCell = { char: string; tone: LedTone; /** Pisca o dígito (ex.: posição errada). */ blink?: boolean };

type CofreFrameProps = {
  /** Um dígito de LED por posição do código; `char: " "` deixa o dígito apagado. */
  cells: CofreCell[];
  /** Teclado travado (fora da vez ou cofre aberto). */
  locked: boolean;
  /** A combinação digitada está completa. */
  canSubmit: boolean;
  /** Cofre aberto: a porta gira e mostra o tesouro. */
  opened: boolean;
  status: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
};

const TREASURE = [
  { icon: "💰", x: "8%", y: "14%", size: 46 },
  { icon: "🪙", x: "60%", y: "10%", size: 34 },
  { icon: "💎", x: "36%", y: "34%", size: 52 },
  { icon: "👑", x: "70%", y: "44%", size: 44 },
  { icon: "💍", x: "12%", y: "56%", size: 34 },
  { icon: "🪙", x: "44%", y: "70%", size: 38 },
  { icon: "💎", x: "74%", y: "74%", size: 32 },
  { icon: "💰", x: "20%", y: "76%", size: 38 },
];

const keyClass =
  "flex h-12 items-center justify-center rounded-md border-2 border-[#3a3a3a] bg-[linear-gradient(180deg,#2a2a2a,#151515)] font-game-pixel text-xl text-[#e8e8e8] shadow-[0_3px_0_#050505] outline-none transition-[transform,opacity] active:translate-y-0.5 active:shadow-none enabled:hover:border-(--neon-cyan) focus-visible:ring-2 focus-visible:ring-(--neon-cyan) disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

/** Moldura de cofre digital: letreiro de LED com um dígito por posição e teclado numérico. Aberto, mostra o tesouro. */
export function CofreFrame({ cells, locked, canSubmit, opened, status, onDigit, onDelete, onSubmit }: CofreFrameProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative w-full max-w-[380px]" style={{ perspective: 1200 }}>
      {/* interior do cofre: ouro, dinheiro e joias reluzindo */}
      <div
        aria-hidden={!opened}
        className="absolute inset-0 overflow-hidden rounded-xl border-4 border-[#8a6d1d] bg-[radial-gradient(circle_at_50%_40%,#5a3d06,#1c1203_75%)] shadow-[inset_0_0_40px_rgba(0,0,0,.9)]">
        {opened &&
          TREASURE.map((item, index) => (
            <motion.span
              key={index}
              className="absolute leading-none"
              style={{ left: item.x, top: item.y, fontSize: item.size, filter: "drop-shadow(0 0 10px #ffd84a)" }}
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={
                reduceMotion
                  ? { scale: 1, opacity: 1 }
                  : { scale: [0, 1.25, 1, 1.12, 1], opacity: 1, rotate: [0, -8, 8, 0] }
              }
              transition={{ duration: 1.6, delay: 0.5 + index * 0.12, repeat: reduceMotion ? 0 : Infinity, repeatDelay: 1.2 }}>
              {item.icon}
            </motion.span>
          ))}
      </div>

      {/* porta: gira para o lado quando o cofre abre */}
      <motion.div
        className={`relative rounded-xl border-4 border-[#4b4b4b] bg-[linear-gradient(160deg,#3a3a3a,#1a1a1a_60%,#2b2b2b)] p-4 shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.12)] ${opened ? "pointer-events-none" : ""}`}
        style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
        animate={opened ? (reduceMotion ? { opacity: 0 } : { rotateY: -112, opacity: [1, 1, 0] }) : { rotateY: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.3 : 1.3, ease: "easeInOut" }}
        aria-hidden={opened}>
        <div
          role="status"
          aria-label={status}
          className="mb-4 overflow-hidden rounded-lg border border-black bg-[#050404] px-3 py-3 shadow-[inset_0_0_26px_rgba(0,0,0,.9)]">
          <div className="flex h-[clamp(48px,14vw,78px)] w-full items-center justify-center gap-[2%]" style={{ transform: "skewX(-6deg)" }}>
            {cells.map((cell, index) => (
              <LedDigit key={index} char={cell.char} tone={cell.tone} className={cell.blink ? "flex-1 blink" : "flex-1"} />
            ))}
          </div>
          <p className="mt-2 text-center font-game-pixel text-[10px] tracking-[.18em] text-[#1f7a43] uppercase">{status}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button key={digit} type="button" className={keyClass} disabled={locked} onClick={() => onDigit(digit)}>
              {digit}
            </button>
          ))}
          <button type="button" className={keyClass} disabled={locked} onClick={onDelete} aria-label="Apagar último dígito">
            <Delete size={20} />
          </button>
          <button type="button" className={keyClass} disabled={locked} onClick={() => onDigit("0")}>
            0
          </button>
          <button
            type="button"
            className={`${keyClass} border-[#1f7a43] text-[#39ff7a]`}
            disabled={locked || !canSubmit}
            onClick={onSubmit}
            aria-label="Confirmar combinação">
            <Unlock size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
