import type { ReactNode } from "react";
import { X } from "lucide-react";
import { GameButton } from "@/components/games/GameButton";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Botões fixos no rodapé (use `GameDialogFooter`); respeitam a área segura do iOS. */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Painel que sobe da base da tela (substitui diálogos longos no celular).
 * Corpo rolável, cabeçalho e rodapé fixos: nada fica cortado em telas baixas.
 */
export function BottomSheet({ open, onOpenChange, title, description, footer, children }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="neon-box mx-auto max-h-[90dvh] w-full max-w-[560px] gap-0 overflow-hidden rounded-t-[18px] bg-[#150d33] p-0 text-white [--neon-c:#6b3cff]">
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-[#4a34a8]" />
        <SheetHeader className="flex-row items-start justify-between gap-3 px-5 pt-3 pb-3">
          <div className="min-w-0">
            <SheetTitle className="font-game-pixel text-[16px] leading-tight font-bold text-white [text-shadow:0_0_8px_var(--neon-pink)]">
              {title}
            </SheetTitle>
            <SheetDescription className={description ? "mt-2 text-xs leading-[1.5] text-[#9b97b2]" : "sr-only"}>
              {description ?? title}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <GameButton variant="special" size="icon" aria-label="Fechar" className="shrink-0">
              <X size={20} />
            </GameButton>
          </SheetClose>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[#4a34a8]/60 bg-[#150d33] px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
        {!footer && <div className="h-[env(safe-area-inset-bottom)] shrink-0" />}
      </SheetContent>
    </Sheet>
  );
}
