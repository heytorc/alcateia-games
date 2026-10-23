import { ArrowLeft, Settings, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconButton } from "./IconButton";
import { gameButtonVariants } from "@/components/games/GameButton";
import { RoomPlayers, type RoomInfo } from "@/components/games/RoomPlayers";
import { useGameStore } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";

export function GameHeader({ title, onSettings, onReset, room, actions }: { title: string; onSettings?: () => void; onReset?: () => void; room?: RoomInfo; actions?: ReactNode }) {
  const { soundEnabled, setSoundEnabled } = useGameStore();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 pt-4 pb-5">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar" className={gameButtonVariants({ variant: "special", size: "icon" })}>
          <Link to="/#jogos">
            <ArrowLeft size={22} />
          </Link>
        </Button>
        <div>
          <h1 className="mt-[3px] font-game-pixel text-[22px] font-bold text-white max-[480px]:text-[15px]">{title}</h1>
          {room ? (
            <span className="mt-1 flex w-fit items-center gap-2 font-game-pixel text-[10px] tracking-[.16em] text-brand-accent">
              PIN
              <strong className="rounded-md border-2 border-[#6b3cff] bg-card px-2 py-0.5 text-[12px] tracking-[.25em] text-white shadow-[0_0_8px_rgba(107,60,255,.5)]">
                {room.pin}
              </strong>
            </span>
          ) : (
            <span className="text-[10px] font-extrabold tracking-[.16em] text-[#a29bfe]">ALCATEIA GAMES</span>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {actions}
          {room && <RoomPlayers {...room} />}
          <IconButton
            label={soundEnabled ? "Desligar sons" : "Ligar sons"}
            onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </IconButton>
          {onSettings && (
            <IconButton label="Abrir configurações" onClick={onSettings}>
              <Settings size={20} />
            </IconButton>
          )}
          {onReset && (
            <IconButton label="Resetar sessão" onClick={onReset}>
              <RotateCcw size={20} />
            </IconButton>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
