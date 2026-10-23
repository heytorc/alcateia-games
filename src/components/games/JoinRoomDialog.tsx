import { InputOTP } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameButton } from "@/components/games/GameButton";
import { GameDialogFooter } from "@/components/games/GameDialogFooter";

type JoinRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: string;
  onPinChange: (pin: string) => void;
  /** Chamado ao confirmar; o diálogo se fecha em seguida. */
  onConfirm: () => void;
};

export function JoinRoomDialog({ open, onOpenChange, pin, onPinChange, onConfirm }: JoinRoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(700px,90vh)] w-[min(450px,calc(100%-32px))] overflow-auto rounded-[6px] border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)] sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-game-pixel text-[22px] font-bold">Entrar na sala</DialogTitle>
          <DialogDescription className="my-3 mb-[25px] text-xs leading-[1.5] text-[#9b97b2]">
            Digite o código da sala para começar a jogar com a sua alcateia.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-6 flex flex-col items-center gap-4">
          <Label className="text-xs uppercase tracking-widest text-[#9b97b2]">Código da Sala</Label>
          <InputOTP maxLength={4} value={pin} onChange={(event) => onPinChange(event.target.value)} />
        </div>
        <GameDialogFooter>
          <GameButton variant="special" onClick={() => onOpenChange(false)}>
            Cancelar
          </GameButton>
          <GameButton
            variant="game"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}>
            Confirmar
          </GameButton>
        </GameDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
