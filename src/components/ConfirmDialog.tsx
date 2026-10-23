import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(700px,90vh)] w-[min(450px,calc(100%-32px))] overflow-auto rounded-[6px] border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)]">
        <DialogHeader>
          <DialogTitle className="font-game-pixel text-[16px] font-bold">{title}</DialogTitle>
          <DialogDescription className="my-3 mb-[25px] text-xs leading-[1.5] text-[#9b97b2]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="m-0 flex-row justify-end gap-[9px] border-0 bg-transparent p-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-auto border-2 border-[#4a34a8] bg-white/8 px-[18px] py-[13px] text-sm font-extrabold text-[#bbb7ce] hover:bg-white/12 hover:text-white">
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="h-auto border-0 border-b-4 border-black/25 bg-[#d63031] px-[18px] py-[13px] text-sm font-extrabold text-white hover:bg-[#d63031] hover:brightness-110">
            <Check size={17} /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
