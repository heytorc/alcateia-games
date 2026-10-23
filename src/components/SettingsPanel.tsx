import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gameButtonVariants } from "@/components/games/GameButton";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function SettingsPanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(450px,100%)] gap-0 overflow-auto rounded-l-md border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)]">
        <SheetHeader className="mb-[17px] p-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-game-pixel text-[16px] font-bold text-white">Configurações</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar" className={gameButtonVariants({ variant: "special", size: "icon" })}>
                <X size={20} />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">Ajuste as configurações do jogo.</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
