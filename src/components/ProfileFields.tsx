import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameButton } from "@/components/games/GameButton";
import { Plus } from "lucide-react";
import { useGameStore } from "@/lib/store";

const avatarOptions = ["🐺", "🦊", "🐼", "🦁", "🐸", "🐙", "🦄", "🐲"];

export function ProfileFields() {
  const { profile, customAvatars, updateProfile, addCustomAvatar } = useGameStore();
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newAvatar, setNewAvatar] = useState("");

  const handleCustomSubmit = () => {
    if (newAvatar.trim()) {
      const emoji = newAvatar.trim().slice(0, 2);
      updateProfile({ avatar: emoji });
      addCustomAvatar(emoji);
    }
    setIsAddingCustom(false);
    setNewAvatar("");
  };

  const avatars = [...avatarOptions, ...customAvatars.filter((avatar) => !avatarOptions.includes(avatar))];

  return (
    <>
      <div className="mt-[18px] flex flex-col gap-2 font-game-pixel text-[10px] uppercase tracking-[.18em] text-brand-accent">
        <Label htmlFor="profile-name" className="font-game-pixel text-[10px] uppercase tracking-[.18em]">Nome</Label>
        <Input
          id="profile-name"
          maxLength={24}
          placeholder="Digite seu nome"
          value={profile.name}
          onChange={(event) => updateProfile({ name: event.target.value })}
          className="h-auto rounded-md border-2 border-[#4a34a8] bg-[#0a0618] px-3 py-[10px] font-sans text-sm normal-case tracking-normal text-white shadow-[inset_0_0_10px_rgba(107,60,255,.25)] placeholder:text-muted-foreground focus-visible:border-(--btn-info-glow) focus-visible:shadow-[0_0_14px_var(--btn-info-glow),inset_0_0_10px_rgba(0,240,255,.2)] focus-visible:ring-0"
        />
      </div>
      <div className="mt-[18px] flex flex-col gap-2 font-game-pixel text-[10px] uppercase tracking-[.18em] text-brand-accent">
        <span>Avatar</span>
        <div className="flex flex-wrap gap-[6px]">
          {avatars.map((avatar) => (
            <GameButton
              type="button"
              variant={profile.avatar === avatar ? "warning" : "special"}
              size="icon"
              className="size-[40px] min-h-0 min-w-0 p-0 text-[19px] font-sans"
              key={avatar}
              onClick={() => updateProfile({ avatar })}
              aria-pressed={profile.avatar === avatar}
              aria-label={`Selecionar avatar ${avatar}`}>
              {avatar}
            </GameButton>
          ))}
          {isAddingCustom ? (
            <Input
              autoFocus
              className="size-[40px] rounded-md border-2 border-brand-gold bg-[#0a0618] p-0 text-center text-[19px] text-white shadow-[0_0_12px_#ffe14a] focus-visible:ring-0"
              value={newAvatar}
              onChange={(e) => setNewAvatar(e.target.value)}
              onBlur={handleCustomSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            />
          ) : (
            <GameButton
              type="button"
              variant="info"
              size="icon"
              className="size-[40px] min-h-0 min-w-0 border-dashed p-0"
              onClick={() => setIsAddingCustom(true)}
              aria-label="Escolher outro emoji">
              <Plus size={17} />
            </GameButton>
          )}
        </div>
      </div>
    </>
  );
}
