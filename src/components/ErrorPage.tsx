import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { GameButton } from "@/components/games/GameButton";

export type ErrorKind = "404" | "500" | "offline" | "sala" | "multiplayer";

type ErrorAction = {
  label: string;
  variant: "game" | "info" | "special";
  /** Rota interna; sem `to`, o botão chama `onClick`. */
  to?: string;
  onClick?: () => void;
};

type ErrorPageProps = {
  kind: ErrorKind;
  /** PIN exibido em `sala`. */
  pin?: string;
  /** Texto técnico exibido em `500`. */
  detail?: string;
  /** Substitui os botões padrão do tipo. */
  actions?: ErrorAction[];
  /** Sobrescreve o texto padrão. */
  children?: ReactNode;
};

const reload = () => window.location.reload();

const pages: Record<ErrorKind, { color: string; kicker: string; code?: string; title: string; text: string; lost?: boolean; actions: ErrorAction[] }> = {
  "404": {
    color: "#ff2e93",
    kicker: "ERRO 404",
    code: "404",
    lost: true,
    title: "Essa trilha não leva a lugar nenhum",
    text: "O endereço não existe ou mudou de lugar. Volte ao início e escolha uma brincadeira.",
    actions: [
      { label: "Voltar ao início", variant: "game", to: "/" },
      { label: "Ver os jogos", variant: "info", to: "/#jogos" },
    ],
  },
  "500": {
    color: "#ff4552",
    kicker: "ERRO 500",
    code: "500",
    title: "Algo quebrou por aqui",
    text: "Tivemos um erro inesperado. Tente de novo; se continuar, recarregue a página ou volte ao início.",
    actions: [
      { label: "Tentar de novo", variant: "game", onClick: reload },
      { label: "Voltar ao início", variant: "special", to: "/" },
    ],
  },
  offline: {
    color: "#6b3cff",
    kicker: "SEM CONEXÃO",
    code: "OFF",
    title: "Você está offline",
    text: "Os sorteios continuam funcionando sem internet. Impostor, Tempo Certo e Campo Minado precisam de conexão para abrir salas.",
    actions: [
      { label: "Tentar de novo", variant: "game", onClick: reload },
      { label: "Jogar offline", variant: "info", to: "/#jogos" },
    ],
  },
  sala: {
    color: "#ffe14a",
    kicker: "SALA NÃO ENCONTRADA",
    title: "Essa sala não existe mais",
    text: "O anfitrião pode ter encerrado a sala ou o código está errado. Confira o PIN ou crie uma nova sala.",
    actions: [
      { label: "Voltar às salas", variant: "game", onClick: reload },
      { label: "Sair", variant: "special", to: "/" },
    ],
  },
  multiplayer: {
    color: "#00f0ff",
    kicker: "503 · MULTIPLAYER",
    code: "503",
    title: "Salas online fora do ar",
    text: "Não conseguimos falar com o servidor das salas agora. Os jogos de sorteio seguem disponíveis enquanto isso.",
    actions: [
      { label: "Tentar de novo", variant: "game", onClick: reload },
      { label: "Jogos offline", variant: "info", to: "/#jogos" },
    ],
  },
};

/** Tela de erro em tela cheia (com header e rodapé do app). Textos e cores por tipo; os botões podem ser trocados via `actions`. */
export function ErrorPage({ kind, pin, detail, actions, children }: ErrorPageProps) {
  const page = pages[kind];
  const buttons = actions ?? page.actions;

  return (
    <Shell>
      <main className="mx-auto my-[4vh] mb-[60px] flex w-[min(720px,calc(100%-40px))] flex-col items-center text-center">
        <section
          role="alert"
          className="neon-box flex w-full flex-col items-center gap-4 rounded-md bg-background/85 px-[26px] py-[34px] max-[480px]:px-4 max-[480px]:py-[26px]"
          style={{ "--neon-c": page.color } as CSSProperties}>
          <img
            src={`${import.meta.env.BASE_URL}logo-wolf.svg`}
            alt=""
            draggable={false}
            className={`err-wolf ${page.lost ? "err-wolf-lost" : ""}`}
          />
          <span className="font-game-pixel text-[10px] tracking-[.3em] text-brand-accent">{page.kicker}</span>
          {page.code && (
            <div className="err-code" data-t={page.code}>
              {page.code}
            </div>
          )}
          {pin && (
            <div className="err-pin" aria-label={`PIN ${pin}`}>
              {[...pin].map((digit, index) => (
                <i key={index}>{digit}</i>
              ))}
            </div>
          )}
          <h1 className="font-game-pixel text-[clamp(18px,4.6vw,26px)] leading-tight font-bold tracking-[.04em] [text-shadow:0_0_8px_var(--neon-c)]">
            {page.title}
          </h1>
          <p className="max-w-[460px] text-[15px] leading-[1.6] text-[#c2b9d1]">{children ?? page.text}</p>
          {detail && (
            <div className="w-full rounded-md border border-dashed border-[#4a34a8] bg-[#0a0618] px-3 py-2.5 text-left text-xs break-words text-[#9b97b2]">
              <strong className="font-normal text-brand-gold">Detalhes técnicos</strong>
              <br />
              {detail}
            </div>
          )}
          <div className="mt-1.5 flex w-full flex-wrap justify-center gap-3 max-[480px]:flex-col">
            {buttons.map((action) =>
              action.to ? (
                <GameButton key={action.label} variant={action.variant} asChild>
                  <Link to={action.to}>{action.label}</Link>
                </GameButton>
              ) : (
                <GameButton key={action.label} variant={action.variant} onClick={action.onClick}>
                  {action.label}
                </GameButton>
              ),
            )}
          </div>
        </section>
      </main>
    </Shell>
  );
}
