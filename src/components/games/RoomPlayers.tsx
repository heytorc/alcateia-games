import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { gameButtonVariants } from "@/components/games/GameButton";
import { PlayerList, type PlayerListItem } from "@/components/games/PlayerList";
import { RoomPin } from "@/components/games/RoomPin";
import { X } from "lucide-react";

export type RoomInfo = { pin: string; players: PlayerListItem[]; max?: number };

/** Ícone da sala com contador; ao tocar abre um drawer com os participantes. */
export function RoomPlayers({ pin, players, max = 8 }: RoomInfo) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Participantes da sala: ${players.length} de ${max}`}
          className={`${gameButtonVariants({ variant: "special", size: "icon" })} relative overflow-visible`}>
          <Users />
          <span className="absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-md border-2 border-black bg-accent px-1 font-game-pixel text-[10px] leading-4 text-accent-foreground">
            {players.length}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(420px,100%)] gap-0 overflow-auto rounded-l-md border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)]">
        <SheetHeader className="mb-5 p-0">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-game-pixel text-[16px] font-bold text-white">
              Jogadores {players.length}/{max}
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar" className={gameButtonVariants({ variant: "special", size: "icon" })}>
                <X />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">Lista de participantes da sala {pin}.</SheetDescription>
        </SheetHeader>
        <div className="mb-6">
          <RoomPin pin={pin} />
        </div>
        <PlayerList bare players={players} max={max} />
      </SheetContent>
    </Sheet>
  );
}
