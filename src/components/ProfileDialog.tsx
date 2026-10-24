import { Check } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { GameButton } from "@/components/games/GameButton";
import { ProfileFields } from "./ProfileFields";
import { TransitionPicker } from "./TransitionPicker";

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Seu perfil"
      description="Escolha como a alcateia vai te reconhecer."
      footer={
        <GameButton variant="game" className="w-full" onClick={onClose}>
          <Check /> Salvar
        </GameButton>
      }>
      <ProfileFields />
      <TransitionPicker />
    </BottomSheet>
  );
}
