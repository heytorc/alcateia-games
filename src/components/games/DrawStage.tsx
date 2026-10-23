import type { CSSProperties, ReactNode } from "react";
import { GameIcon, type GameIconId } from "@/components/games/GameIcon";
import { NeonSpark } from "@/components/games/NeonSpark";
import { Button } from "@/components/ui/button";

type DrawStageProps = {
  /** Cor neon do palco (qualquer valor CSS de cor). */
  color: string;
  icon: GameIconId;
  ariaLabel: string;
  /** Texto exibido antes do primeiro sorteio. */
  idleText: string;
  /** Legenda acima do resultado ("O número sorteado foi"). */
  resultLabel: string;
  /** Resultado já formatado; `null` mostra o estado inicial. */
  value: string | null;
  /** Muda a cada sorteio para disparar o curto-circuito na borda. */
  trigger: number;
  onDraw: () => void;
};

/** Botão de sorteio em tela cheia: ícone no início, resultado grande com brilho neon depois. */
export function DrawStage({ color, icon, ariaLabel, idleText, resultLabel, value, trigger, onDraw }: DrawStageProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={ariaLabel}
      className="grid h-auto min-h-[430px] w-full flex-1 relative cursor-pointer place-items-center neon-box [--neon-c:var(--stage-color)] rounded-md bg-[color-mix(in_srgb,var(--stage-color)_16%,#0a0618)] hover:bg-[color-mix(in_srgb,var(--stage-color)_22%,#0a0618)] p-6 text-center text-white hover:text-white max-[760px]:min-h-[370px]"
      style={{ "--stage-color": color } as CSSProperties}
      onClick={onDraw}>
      <NeonSpark trigger={trigger} />
      <div className="flex flex-col items-center gap-2.5">
        {value === null ? (
          <>
            <GameIcon id={icon} size={57} />
            <span className="text-sm font-bold opacity-80">{idleText}</span>
          </>
        ) : (
          <>
            <span className="text-sm font-bold opacity-80">{resultLabel}</span>
            <span
              key={value}
              style={{ fontSize: `clamp(28px, calc((min(100vw, 1180px) - 80px) / ${(value.length * 0.8 + 0.8).toFixed(2)}), 220px)` }}
              className="neon-on whitespace-nowrap font-game-pixel leading-[.8] font-extrabold tracking-[.06em] indent-[.06em] [text-shadow:0_0_12px_var(--stage-color),0_0_40px_var(--stage-color)]">
              {value}
            </span>
          </>
        )}
      </div>
    </Button>
  );
}

export function DrawError({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-[#e17055]/50 bg-[#e17055]/10 px-3 py-2 text-sm text-[#ffd0c7]" role="alert">
      {children}
    </p>
  );
}
