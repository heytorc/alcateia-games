import { transitions } from "@/components/transitions/PageTransition";
import { GameButton } from "@/components/games/GameButton";
import { transitionIds } from "@/constants/transitions";
import { useGameStore } from "@/lib/store";

/** Escolha da animação de troca de página; vale para as próximas navegações e fica salva no navegador. */
export function TransitionPicker() {
  const { transition, setTransition } = useGameStore();

  return (
    <div className="mt-9 flex flex-col gap-3 font-game-pixel text-[12px] uppercase tracking-[.16em] text-brand-accent">
      <span id="transition-label">Transição de página</span>
      <div role="radiogroup" aria-labelledby="transition-label" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {transitionIds.map((id) => {
          const selected = transition === id;
          return (
            <GameButton
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? "warning" : "special"}
              className="h-auto min-h-11 min-w-0 justify-start px-3 py-2 text-left text-[10px] leading-snug normal-case tracking-normal"
              onClick={() => setTransition(id)}>
              {transitions[id].name}
            </GameButton>
          );
        })}
      </div>
    </div>
  );
}
