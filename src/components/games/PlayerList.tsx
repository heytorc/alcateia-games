import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export type PlayerListItem = {
  id: string;
  name: string;
  avatar: string;
  /** Selo ao lado do nome, ex.: HOST ou VOCÊ. */
  tag?: string;
  /** Marcador à direita, ex.: um ícone ou um texto de status. */
  status?: ReactNode;
  /** Destaca com neon, ex.: o jogador da vez. */
  active?: boolean;
};

export function PlayerList({
  players,
  max = 8,
  title = "JOGADORES",
  bare = false,
}: {
  players: PlayerListItem[];
  max?: number;
  title?: string;
  /** Sem moldura nem título, para uso dentro de outro painel (ex.: drawer). */
  bare?: boolean;
}) {
  const list = (
    <ul className="grid gap-2">
        {players.map((player) => (
          <li
            key={player.id}
            className={`flex min-h-11 items-center gap-2.5 rounded-md bg-muted px-3 py-2.5 ${
              player.active ? "neon-box" : "border-2 border-[#3a2a80]"
            }`}>
            <span className="text-xl leading-none">{player.avatar}</span>
            <span className="min-w-0 flex-1 truncate">{player.name}</span>
            {player.tag && (
              <Badge className="rounded-md border-2 border-[#6b3cff] bg-accent font-game-pixel text-[10px] tracking-[.08em] text-accent-foreground">
                {player.tag}
              </Badge>
            )}
            {player.status !== undefined && (
              <span className="font-game-pixel text-[11px] text-brand-accent">{player.status}</span>
            )}
          </li>
        ))}
      </ul>
  );
  if (bare) return list;
  return (
    <section
      aria-label={title}
      className="neon-box [--neon-c:#6b3cff] w-full rounded-md bg-card p-5 text-left text-card-foreground">
      <h3 className="mb-3.5 flex items-center gap-2 font-game-pixel text-[13px] tracking-[.1em]">
        {title}
        <Badge className="rounded-md border-2 border-[#6b3cff] bg-accent font-game-pixel text-[10px] tracking-[.08em] text-accent-foreground">
          {players.length}/{max}
        </Badge>
      </h3>
      {list}
    </section>
  );
}
