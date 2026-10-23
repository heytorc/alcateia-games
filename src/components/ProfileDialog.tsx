import { Check, X } from "lucide-react";
import { GameButton } from "@/components/games/GameButton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileFields } from "./ProfileFields";
import { TransitionPicker } from "./TransitionPicker";

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="neon-box max-h-[min(700px,90vh)] w-[min(480px,calc(100%-32px))] overflow-auto rounded-[6px] bg-[#150d33] p-6 text-white [--neon-c:#6b3cff]">
        <DialogHeader className="mb-[17px] flex-row items-center justify-between">
          <DialogTitle className="font-game-pixel text-[16px] font-bold [text-shadow:0_0_8px_var(--neon-pink)]">Seu perfil</DialogTitle>
          <DialogClose asChild>
            <GameButton variant="special" size="icon" aria-label="Fechar">
              <X size={20} />
            </GameButton>
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="mb-[25px] text-xs leading-[1.5] text-[#9b97b2]">
          Escolha como a alcateia vai te reconhecer.
        </DialogDescription>
        <ProfileFields />
        <TransitionPicker />
        <DialogFooter className="mt-6 -mx-0 -mb-0 border-0 bg-transparent p-0">
          <DialogClose asChild>
            <GameButton variant="game" className="w-full">
              <Check /> Salvar
            </GameButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
