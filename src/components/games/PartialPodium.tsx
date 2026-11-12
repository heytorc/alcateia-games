import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatStopwatch } from "@/lib/utils";

export type PodiumPlayer = { id: string; name: string; avatar: string; excessMs: number };

/** Ids ordenados do menor para o maior desvio acumulado (ou do maior para o menor, com `higherIsBetter`). */
export const podiumOrder = (players: PodiumPlayer[], higherIsBetter = false) =>
  [...players].sort((a, b) => (higherIsBetter ? b.excessMs - a.excessMs : a.excessMs - b.excessMs)).map((player) => player.id);

type PartialPodiumProps = {
  players: PodiumPlayer[];
  previousOrder: string[] | null;
  selfId: string;
  /** Pontuação em que mais é melhor (ex.: acertos). Por padrão, menor é melhor e o valor é um tempo. */
  higherIsBetter?: boolean;
  /** Formata o valor da linha; por padrão, cronômetro. */
  format?: (value: number) => string;
};

const SETTLE_DELAY_MS = 1100;

/**
 * Pódio parcial entre rodadas. Começa na ordem da rodada anterior (`previousOrder`) e, depois de um
 * instante, passa para a ordem atual: as linhas se movem (`layout`) mostrando quem subiu e quem desceu.
 */
export function PartialPodium({ players, previousOrder, selfId, higherIsBetter = false, format = formatStopwatch }: PartialPodiumProps) {
  const reduceMotion = useReducedMotion();
  const currentOrder = useMemo(() => podiumOrder(players, higherIsBetter), [players, higherIsBetter]);
  const startOrder = useMemo(() => {
    if (!previousOrder) return currentOrder;
    const known = previousOrder.filter((id) => currentOrder.includes(id));
    return [...known, ...currentOrder.filter((id) => !known.includes(id))];
  }, [previousOrder, currentOrder]);
  const [shown, setShown] = useState(startOrder);
  const settled = shown.join() === currentOrder.join();

  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => setShown(currentOrder), reduceMotion ? 0 : SETTLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settled, currentOrder, reduceMotion]);

  const byId = new Map(players.map((player) => [player.id, player]));
  // Tempos empatam na centésima; pontos, no valor exato.
  const bucket = (value: number) => (higherIsBetter ? value : Math.floor(value / 10));
  const rankOf = (player: PodiumPlayer) =>
    players.filter((other) => (higherIsBetter ? bucket(other.excessMs) > bucket(player.excessMs) : bucket(other.excessMs) < bucket(player.excessMs))).length + 1;

  return (
    <ol aria-label="Pódio parcial" className="grid w-full gap-2">
      {shown.map((id, index) => {
        const player = byId.get(id);
        if (!player) return null;
        const rank = settled ? rankOf(player) : index + 1;
        const moved = settled && previousOrder ? startOrder.indexOf(id) - currentOrder.indexOf(id) : 0;
        const leader = rank === 1;
        const self = id === selfId;
        return (
          <motion.li
            key={id}
            layout={!reduceMotion}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-md border-2 p-3 text-left ${
              leader ? "border-[#ffe14a] bg-[#ffe14a] text-[#29223e] shadow-[0_0_14px_#ffe14a]" : self ? "border-(--neon-cyan) bg-[#1b1040] shadow-[0_0_12px_var(--neon-cyan)]" : "border-[#4a34a8] bg-[#1b1040]"
            }`}>
            <span className={`font-game-pixel text-lg ${leader ? "text-[#4b3c16]" : "text-[#bbb5d3]"}`}>{rank}º</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-2xl leading-none">{player.avatar}</span>
              <strong className="truncate">{player.name}</strong>
              {moved !== 0 && (
                <span
                  className={`flex items-center text-[11px] font-bold ${moved > 0 ? "text-[#3ddc84]" : "text-[#ff6b6b]"}`}
                  aria-label={moved > 0 ? `subiu ${moved}` : `desceu ${-moved}`}>
                  {moved > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(moved)}
                </span>
              )}
            </span>
            <small className={`font-game-pixel text-xs ${leader ? "text-[#4b3c16]" : "text-[#ffe14a]"}`}>{format(player.excessMs)}</small>
          </motion.li>
        );
      })}
    </ol>
  );
}
