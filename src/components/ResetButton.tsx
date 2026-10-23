import { RotateCcw } from "lucide-react";
import { GameButton } from "@/components/games/GameButton";

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <GameButton variant="special" size="sm" onClick={onClick}>
      <RotateCcw /> Resetar sessão
    </GameButton>
  );
}
