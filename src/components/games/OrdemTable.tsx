import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { GameButton } from "@/components/games/GameButton";
import type { ReplayEntry } from "@/lib/ordem-silenciosa-rules";
import { cn } from "@/lib/utils";

type Person = { name: string; avatar: string };
export type Seat = Person & { id: string; cards: number; self: boolean };

const SIZES = { sm: "h-14 w-10 text-base", md: "h-20 w-14 text-2xl", lg: "h-28 w-20 text-4xl" };

/** Carta de 1 a 100: frente branca com o número em roxo, ou verso (`faceDown`). */
export function PlayingCard({
  value,
  size = "md",
  faceDown = false,
  className,
}: {
  value?: number;
  size?: keyof typeof SIZES;
  faceDown?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg border-2 border-[#12101f] font-game-pixel shadow-[3px_3px_0_#12101f]",
        faceDown
          ? "bg-[repeating-linear-gradient(45deg,#6b3cff_0_6px,#4a2bb8_6px_12px)]"
          : "bg-white text-[#7b61ff]",
        SIZES[size],
        className,
      )}>
      {!faceDown && value}
    </span>
  );
}

/** Posição de cada lugar em volta da mesa, em fração do tamanho dela: o jogador local fica embaixo, no centro. */
function seatPosition(index: number, count: number) {
  const angle = Math.PI / 2 + (index * 2 * Math.PI) / count;
  return { x: Math.cos(angle) * 0.44, y: Math.sin(angle) * 0.4 };
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Mesa de cartas: feltro oval com os jogadores (emoji, nome e cartas na mão) em volta e, no centro, as cartas
 * jogadas no nível, na ordem. Cada carta nova sai do lugar de quem a jogou e desliza até a mesa.
 */
export function CardTable({
  seats,
  pile,
  children,
}: {
  seats: Seat[];
  pile: { card: number; by: string }[];
  /** Camada por cima da mesa (ex.: replay do erro). */
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [ref, size] = useSize<HTMLDivElement>();
  const ordered = [...seats.filter((seat) => seat.self), ...seats.filter((seat) => !seat.self)];
  const positions = new Map(ordered.map((seat, index) => [seat.id, seatPosition(index, ordered.length)]));
  const overlap = pile.length > 8 ? -30 : pile.length > 4 ? -20 : -8;

  return (
    <div ref={ref} className="relative mx-auto aspect-[4/3] w-full max-w-[600px] select-none sm:aspect-[16/10]">
      <div
        aria-hidden="true"
        className="absolute inset-[16%_12%] rounded-[50%] border-[6px] border-[#3a2350] bg-[radial-gradient(ellipse_at_center,#1d6b47_0%,#0f3f2b_70%,#0a2c1f_100%)] shadow-[0_0_0_3px_#a29bfe,0_0_22px_#a29bfe88,inset_0_0_40px_#000a]"
      />
      <ol
        aria-label="Cartas jogadas no nível, em ordem"
        className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center">
        {pile.length === 0 && (
          <li className="rounded-md border border-dashed border-[#a29bfe]/60 px-3 py-6 text-xs text-[#d8d2f0]">
            Mesa vazia
          </li>
        )}
        <AnimatePresence initial={false}>
          {pile.map(({ card, by }, index) => {
            const from = positions.get(by) ?? { x: 0, y: 0.4 };
            return (
              <motion.li
                key={card}
                layout={!reduceMotion}
                style={{ marginLeft: index === 0 ? 0 : overlap, zIndex: index }}
                initial={
                  reduceMotion
                    ? false
                    : { x: from.x * size.width, y: from.y * size.height, rotate: -25, scale: 0.6, opacity: 0 }
                }
                animate={{ x: 0, y: 0, rotate: ((card % 7) - 3) * 2, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                aria-label={`${card}`}>
                <PlayingCard value={card} size="sm" />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {ordered.map((seat) => {
        const { x, y } = positions.get(seat.id)!;
        return (
          <div
            key={seat.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${50 + x * 100}%`, top: `${50 + y * 100}%` }}>
            <span
              className={cn(
                "grid size-11 place-items-center rounded-full border-2 bg-[#150d33] text-2xl sm:size-12",
                seat.self ? "border-[#00e5ff] shadow-[0_0_12px_#00e5ff88]" : "border-[#a29bfe]",
              )}
              aria-hidden="true">
              {seat.avatar}
            </span>
            <span className="max-w-[90px] truncate text-xs font-bold text-white">
              {seat.self ? "Você" : seat.name}
            </span>
            <span className="flex items-center gap-0.5 whitespace-nowrap" aria-label={`${seat.cards} ${seat.cards === 1 ? "carta" : "cartas"}`}>
              {Array.from({ length: Math.min(seat.cards, 6) }, (_, index) => (
                <span
                  key={index}
                  className="h-3.5 w-2.5 rounded-[2px] border border-[#12101f] bg-[repeating-linear-gradient(45deg,#6b3cff_0_2px,#4a2bb8_2px_4px)]"
                />
              ))}
              {seat.cards > 6 && <span className="text-[10px] text-[#c2b9d1]">+{seat.cards - 6}</span>}
              {seat.cards === 0 && <span className="text-[10px] text-[#9b97b2]">sem cartas</span>}
            </span>
          </div>
        );
      })}
      {children}
    </div>
  );
}

const SHUFFLE_MS = 1300;
const AUTO_CLOSE_MS = 9000;

/**
 * Replay do erro, por cima da mesa: as cartas da rodada embaralham viradas e depois aparecem em ordem crescente,
 * com o nome de quem tinha cada uma; as que saíram fora de ordem ficam em neon vermelho.
 */
export function MistakeReplay({
  entries,
  people,
  onClose,
}: {
  entries: ReplayEntry[];
  people: (id: string) => Person;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(Boolean(reduceMotion));

  useEffect(() => {
    const reveal = window.setTimeout(() => setRevealed(true), reduceMotion ? 0 : SHUFFLE_MS);
    const close = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(close);
    };
  }, [onClose, reduceMotion]);

  return (
    <motion.div
      role="dialog"
      aria-label="Erro na sequência"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-[24px] bg-[#0a0618]/90 p-3">
      <GameButton
        variant="special"
        size="icon"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute top-2 right-2">
        <X size={18} />
      </GameButton>
      <p className="font-game-pixel text-sm text-[#ff6b81] [text-shadow:0_0_8px_#ff4552]">Fora de ordem!</p>
      {!revealed ? (
        <div className="relative h-28 w-20" aria-hidden="true">
          {entries.map((entry, index) => (
            <motion.span
              key={entry.card}
              className="absolute inset-0"
              animate={{
                x: [0, (index % 2 ? 1 : -1) * (30 + index * 6), 0],
                rotate: [0, (index % 2 ? 1 : -1) * 18, 0],
              }}
              transition={{ duration: 0.45, repeat: 2, delay: index * 0.05 }}>
              <PlayingCard faceDown size="lg" />
            </motion.span>
          ))}
        </div>
      ) : (
        <ol aria-label="Ordem certa" className="flex max-w-full flex-wrap items-start justify-center gap-2">
          {entries.map((entry, index) => {
            const wrong = entry.status !== "ok";
            const person = people(entry.by);
            return (
              <motion.li
                key={entry.card}
                initial={reduceMotion ? false : { rotateY: 90, opacity: 0, y: 12 }}
                animate={{ rotateY: 0, opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12 }}
                className="flex w-16 flex-col items-center gap-1 text-center">
                <PlayingCard
                  value={entry.card}
                  size="md"
                  className={wrong ? "border-[#ff4552] shadow-[0_0_0_2px_#ff4552,0_0_16px_#ff4552]" : undefined}
                />
                <span className="w-full truncate text-[11px] text-white">
                  {person.avatar} {person.name}
                </span>
                {wrong && (
                  <span className="text-[10px] leading-tight text-[#ff8fab]">
                    {entry.status === "early" ? "jogou antes" : "devia ir antes"}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.div>
  );
}
