import { ArrowLeft, LogOut, Settings, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconButton } from "./IconButton";
import { gameButtonVariants } from "@/components/games/GameButton";
import { RoomPlayers, type RoomInfo } from "@/components/games/RoomPlayers";
import { useGameStore } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameButton } from "@/components/games/GameButton";
import { GameDialogFooter } from "@/components/games/GameDialogFooter";

/** Saída da sala: o anfitrião encerra a sala para todos; os demais só saem. Sempre pede confirmação. */
export type RoomLeave = { host: boolean; onConfirm: () => void };

export function GameHeader({ title, onSettings, onReset, room, actions, leave }: { title: string; onSettings?: () => void; onReset?: () => void; room?: RoomInfo; actions?: ReactNode; leave?: RoomLeave }) {
  const { soundEnabled, setSoundEnabled } = useGameStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 pt-4 pb-5">
        {leave ? (
          <Button variant="ghost" size="icon" aria-label="Voltar" className={gameButtonVariants({ variant: "special", size: "icon" })} onClick={() => setConfirmOpen(true)}>
            <ArrowLeft size={22} />
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label="Voltar" className={gameButtonVariants({ variant: "special", size: "icon" })}>
            <Link to="/#jogos">
              <ArrowLeft size={22} />
            </Link>
          </Button>
        )}
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
          {leave && (
            <IconButton label={leave.host ? "Encerrar sala" : "Sair da sala"} onClick={() => setConfirmOpen(true)}>
              <LogOut size={20} />
            </IconButton>
          )}
          {onReset && (
            <IconButton label="Resetar sessão" onClick={onReset}>
              <RotateCcw size={20} />
            </IconButton>
          )}
        </div>
      </div>
      {leave && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="w-[min(450px,calc(100%-32px))] rounded-[6px] border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)] sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="font-game-pixel text-[20px] font-bold">{leave.host ? "Encerrar sala?" : "Sair da sala?"}</DialogTitle>
              <DialogDescription className="my-3 mb-[25px] text-xs leading-[1.5] text-[#9b97b2]">
                {leave.host
                  ? "Você é o anfitrião: a sala será encerrada e todos os jogadores serão desconectados."
                  : "Você deixa a partida e volta para a tela inicial do jogo."}
              </DialogDescription>
            </DialogHeader>
            <GameDialogFooter>
              <GameButton variant="special" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </GameButton>
              <GameButton
                variant={leave.host ? "danger" : "game"}
                onClick={() => {
                  setConfirmOpen(false);
                  leave.onConfirm();
                }}>
                <LogOut /> {leave.host ? "Encerrar sala" : "Sair da sala"}
              </GameButton>
            </GameDialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}
