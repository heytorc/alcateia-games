import { formatStopwatch } from "@/lib/utils";

export type ScoreCardPlayer = {
  id: string;
  name: string;
  avatar: string;
  /** Desvio acumulado; `undefined` enquanto o jogador ainda não terminou nenhuma rodada. */
  excessMs?: number;
  /** Texto exibido no lugar do tempo (ex.: "Jogando"). */
  status: string;
};

/** Placar em cards com rolagem horizontal: posição, avatar, nome e tempo, centralizados na vertical. */
export function ScoreCards({ players, selfId }: { players: ScoreCardPlayer[]; selfId: string }) {
  const scored = players.filter((player) => player.excessMs !== undefined);
  const rankOf = (player: ScoreCardPlayer) =>
    player.excessMs === undefined ? null : scored.filter((other) => Math.floor(other.excessMs! / 10) < Math.floor(player.excessMs! / 10)).length + 1;
  const ordered = [...players].sort((a, b) => (a.excessMs ?? Infinity) - (b.excessMs ?? Infinity));

  return (
    <section aria-label="Placar acumulado" className="mt-3 w-full">
      <h2 className="mt-2 mb-3 text-center font-game-pixel text-[16px] tracking-[.22em] text-brand-accent [text-shadow:0_0_8px_var(--neon-cyan)]">PLACAR</h2>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-3 pb-3 [scrollbar-width:thin]">
        {ordered.map((player) => {
          const rank = rankOf(player);
          const self = player.id === selfId;
          return (
            <li
              key={player.id}
              className={`relative flex w-[112px] shrink-0 snap-center flex-col items-center justify-center gap-1.5 rounded-md border-2 bg-[#0a0618] px-2 pt-5 pb-3 text-center ${
                self ? "border-(--neon-cyan) shadow-[0_0_12px_var(--neon-cyan)]" : "border-[#4a34a8]"
              } ${rank === 1 ? "border-[#ffe14a] shadow-[0_0_12px_#ffe14a]" : ""}`}>
              <span
                className={`absolute -top-3 rounded-full border-2 px-2.5 py-0.5 font-game-pixel text-[10px] ${
                  rank === 1 ? "border-[#ffe14a] bg-[#ffe14a] text-[#0a0618]" : "border-[#6b3cff] bg-[#150d33] text-white"
                }`}>
                {rank === null ? "—" : `#${rank}`}
              </span>
              <span className="text-[34px] leading-none">{player.avatar}</span>
              <strong className="w-full truncate text-sm text-white">{player.name}</strong>
              <span className={`font-game-pixel text-[11px] ${player.excessMs === undefined ? "text-[#a39dbb]" : "text-[#ffe14a]"}`}>
                {player.excessMs === undefined ? player.status : formatStopwatch(player.excessMs)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
