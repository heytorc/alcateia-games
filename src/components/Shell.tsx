import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Gamepad } from "lucide-react";
import { Logo } from "./Logo";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { ProfileDialog } from "./ProfileDialog";
import { useGameStore } from "@/lib/store";
import { games } from "@/constants/games";

export function Shell({ children }: { children: React.ReactNode }) {
  const { profile } = useGameStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  // Cor do jogo da rota atual: os <Card> herdam via --game-c.
  const gameColor = games.find((game) => location.pathname === `/${game.id}`)?.color;

  const scrollToGames = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname !== "/") return;
    event.preventDefault();
    document.getElementById("jogos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <TooltipProvider>
      <div
        className="neon-grid scanlines min-h-screen overflow-x-clip bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
        style={gameColor ? ({ "--game-c": gameColor } as React.CSSProperties) : undefined}>
        <header className="sticky top-0 z-40 border-b border-transparent bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex w-[min(1180px,calc(100%-40px))] items-center justify-between gap-2 pt-[calc(26px+env(safe-area-inset-top))] pb-[26px] max-[480px]:pt-[calc(18px+env(safe-area-inset-top))] max-[480px]:pb-[18px]">
          <Logo />
          <nav className="flex min-w-0 items-center gap-2 text-sm font-bold text-muted-foreground">
            <Link
              to="/#jogos"
              onClick={scrollToGames}
              className="flex items-center gap-2 rounded-[6px] px-[14px] py-2.5 hover:bg-white/8 hover:text-white">
              <Gamepad size={18} /> <span className="max-[480px]:sr-only">Jogos</span>
            </Link>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Editar perfil"
              className="h-auto min-w-0 gap-2 rounded-[6px] border-2 border-[#4a34a8] bg-white/7 py-[6px] pr-[9px] pl-[6px] text-[#f3ecff] hover:bg-muted hover:text-[#f3ecff]">
              <Avatar>
                <AvatarFallback className="bg-muted text-lg text-current">{profile.avatar}</AvatarFallback>
              </Avatar>
              <strong className="max-w-[115px] truncate max-[480px]:max-w-[72px] font-game-pixel text-[11px] uppercase">{profile.name || "Seu perfil"}</strong>
            </Button>
          </nav>
          </div>
        </header>
        {children}
        <Footer />
        <ScrollToTop />
        <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
