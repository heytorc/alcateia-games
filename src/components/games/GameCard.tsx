import type { CSSProperties } from "react";

import { Link } from "react-router-dom";

import type { GameId } from "@/constants/games";
import { GameIcon } from "@/components/games/GameIcon";
import { Slide } from "@/components/animate-ui";

export function GameCard({
  id,
  title,
  description,
  color,
  index,
}: {
  id: GameId;
  title: string;
  description: string;
  color: string;
  index: number;
}) {
  const featuredGame = id === "letters" || id === "password" || id === "impostor" || id === "campo-minado";

  return (
    <Slide className="group flex min-h-0 min-w-0" delay={index * 75} direction="up">
      <Link
        to={`/${id}`}
        className="neon-box relative flex min-h-[170px] w-full flex-col justify-between rounded-md bg-background/85 p-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:brightness-125 motion-reduce:transition-none max-[760px]:p-[14px]"
        style={{ "--neon-c": color } as CSSProperties}>
        <div className="grid h-20 place-items-center rounded-sm" style={{ background: `color-mix(in srgb, ${color} 22%, #000)` }}>
          <GameIcon id={id} size={56} />
        </div>
        <div className="mt-2">
          <h3
            className={`font-game-pixel text-[13px] font-bold uppercase tracking-[.06em] [text-shadow:0_0_8px_var(--neon-c)] ${featuredGame ? "text-[15px]" : ""}`} style={{ color }}>
            {title}
          </h3>
          <p className="mt-[5px] text-[13px] leading-[1.4] text-white/80 max-[760px]:text-[12px]">
            {description}
          </p>
        </div>
      </Link>
    </Slide>
  );
}
