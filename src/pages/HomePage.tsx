import { useEffect, useState } from "react";

import { Sparkles, Users } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { games } from "@/constants/games";
import { ProfileFields, Shell } from "@/components";
import { GameCard } from "@/components/games/GameCard";
import { useGameStore } from "@/lib/store";
import { GameButton } from "@/components/games/GameButton";

const roomGameLabel = { impostor: "de Impostor", time: "de Tempo Certo", "campo-minado": "de Campo Minado" } as const;

export function Home() {
  const { profile, lastRoomID, lastGameType } = useGameStore();
  const [showOnboarding] = useState(!profile.name.trim());
  const location = useLocation();
  const navigate = useNavigate();
  const scrollToGames = () => document.getElementById("jogos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  useEffect(() => {
    if (location.hash === "#jogos") requestAnimationFrame(scrollToGames);
  }, [location.hash]);
  return (
    <Shell>
      <main className="mx-auto w-full max-w-screen-xl px-5">
        <section className="flex flex-col items-center gap-5 px-2 pt-6 pb-4 text-center">
          <span className="font-game-pixel text-[10px] tracking-[.3em] text-brand-accent">SEU NOVO HUB DE BRINCADEIRAS</span>
          <h1 className="neon-text font-game-pixel text-[clamp(34px,9vw,76px)] leading-none font-bold tracking-[.04em]">
            ALCATEIA <span className="neon-text-cyan">GAMES</span>
          </h1>
          <p className="max-w-[460px] text-[17px] leading-[1.5] text-white/80">
            Jogos rápidos para aquecer a turma, quebrar o gelo e transformar qualquer encontro em uma história boa.
          </p>
          <div className="blink font-game-pixel text-sm tracking-[.3em] text-brand-gold [text-shadow:0_0_10px_#ffe14a]">INSERT COIN</div>
          <GameButton variant="game" size="lg" onClick={scrollToGames}>
            <Sparkles size={19} /> Começar a jogar
          </GameButton>
          <div className="mt-2 flex flex-wrap justify-center gap-x-7 gap-y-1 font-game-pixel text-[11px] tracking-[.12em] text-brand-accent">
            <span>{games.length} JOGOS</span>
            <span>{games.filter((g) => ["campo-minado", "time", "impostor"].includes(g.id)).length} ONLINE</span>
            <span>CRÉDITOS ∞</span>
          </div>
        </section>
        {showOnboarding && (
          <section className="mt-[35px] grid grid-cols-[minmax(220px,1fr)_minmax(190px,.8fr)_minmax(240px,1fr)] items-end gap-[22px] rounded-md neon-box [--neon-c:#6b3cff] bg-card p-[25px] max-[760px]:grid-cols-1 max-[760px]:gap-[17px]">
            <div>
              <span className="font-game-pixel text-[10px] tracking-[.18em] text-brand-accent">SEU PERFIL</span>
              <h2 className="mt-[7px] font-game-pixel text-[22px] font-bold text-white">
                Como a alcateia vai te chamar?
              </h2>
            </div>
            <ProfileFields />
          </section>
        )}
        {lastRoomID && (
          <section className="mt-[35px] flex flex-col gap-4 rounded-md neon-box [--neon-c:#ffe14a] bg-brand-gold/10 p-[25px] text-white sm:flex-row sm:items-center sm:justify-between max-[420px]:p-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="shrink-0 rounded-md bg-brand-gold p-3 text-[#0a0618]">
                <Users size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="font-game-pixel text-[20px] font-bold leading-tight max-[420px]:text-[16px]">Sessão ativa</h2>
                <p className="text-sm text-white/60">Você tem uma sala {lastGameType ? roomGameLabel[lastGameType] : ""} aguardando.</p>
              </div>
            </div>
            <GameButton
              variant="success"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/${lastGameType}?pin=${lastRoomID}`)}
            >
              Retornar à sala
            </GameButton>
          </section>
        )}
        <section className="pt-[75px] pb-[50px] max-[760px]:pt-[50px]" id="jogos">
          <div className="mb-[25px] flex items-end justify-between max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[9px]">
            <div>
              <span className="font-game-pixel text-[10px] tracking-[.18em] text-brand-accent">
                ESCOLHA SUA AVENTURA
              </span>
              <h2 className="mt-[9px] font-game-pixel text-[22px] font-bold tracking-[.02em] text-white">
                Qual vai ser a brincadeira?
              </h2>
            </div>
            <span className="text-[13px] text-muted-foreground">{games.length} jogos disponíveis</span>
          </div>
          <div className="grid grid-cols-2 gap-[14px] max-[420px]:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
            {games.map((game, index) => (
              <GameCard key={game.id} index={index} {...game} />
            ))}
          </div>
        </section>
        <section
          className="my-5 mb-20 flex gap-[14px] rounded-md border-2 border-[#3a2a80] p-5 text-brand-accent"
          id="como-jogar">
          <Users size={25} />
          <div>
            <strong className="text-white">Feito para jogar em grupo</strong>
            <p className="mt-[5px] text-[13px] text-white/60">
              Abra no celular, tablet ou computador e compartilhe com a sua alcateia.
            </p>
          </div>
        </section>
      </main>
    </Shell>
  );
}
