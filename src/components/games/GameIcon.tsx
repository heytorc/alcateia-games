import type { GameId } from "@/constants/games";

export type GameIconId = GameId | "explosao" | "sair" | "votos" | "trofeu" | "vida" | "festa" | "ok" | "ovelha";

/** Ícone pixel art de `public/icons/games/`. Decorativo: o texto ao redor já descreve o jogo. */
export function GameIcon({ id, size = 56, className = "" }: { id: GameIconId; size?: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/games/${id}.svg`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 [image-rendering:pixelated] ${className}`}
    />
  );
}
