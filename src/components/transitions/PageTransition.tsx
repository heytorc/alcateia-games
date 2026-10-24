import type { ReactNode } from "react";
import { TvStatic } from "@/components/TvStatic";
import { DEFAULT_TRANSITION, isTransitionId, type TransitionId } from "@/constants/transitions";
import { useGameStore } from "@/lib/store";

/**
 * Transições de página neon. Cada variante é uma animação CSS única (`.fx-*`
 * em `styles.css`): a tela é coberta, a rota troca em `swapMs` por baixo do
 * overlay e o overlay se desfaz até `totalMs`.
 */

interface Transition {
  name: string;
  swapMs: number;
  totalMs: number;
  render: () => ReactNode;
}

const ribbons = Array.from({ length: 9 }, (_, i) => i);
const strips = Array.from({ length: 9 }, (_, i) => i);

export const transitions: Record<TransitionId, Transition> = {
  static: {
    name: "Chuvisco de TV",
    swapMs: 240,
    totalMs: 600,
    render: () => (
      <div className="fx fx-static">
        <TvStatic className="size-full opacity-80" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0_3px,rgba(0,0,0,.35)_3px_4px)]" />
      </div>
    ),
  },
  netflix: {
    name: "Netflix “ta-dum”",
    swapMs: 900,
    totalMs: 1800,
    render: () => (
      <div className="fx fx-nf">
        {ribbons.map((i) => (
          <b
            key={i}
            className="fx-nf-rib"
            style={
              {
                "--x": `${(i - 4) * 90}%`,
                "--c1": i % 2 ? "var(--neon-cyan)" : "var(--neon-pink)",
                "--c2": i % 2 ? "#7df3ff" : "#ff8cc6",
                animationDelay: `${0.25 + Math.abs(i - 4) * 0.03}s`,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="fx-nf-logo">A</div>
      </div>
    ),
  },
  tunnel: {
    name: "Túnel de grade",
    swapMs: 700,
    totalMs: 1400,
    render: () => (
      <div className="fx fx-tun">
        <div className="fx-tun-plane fx-tun-ceil" />
        <div className="fx-tun-plane fx-tun-floor" />
        <div className="fx-tun-horizon" />
      </div>
    ),
  },
  sign: {
    name: "Letreiro piscando",
    swapMs: 700,
    totalMs: 1400,
    render: () => (
      <div className="fx fx-sign">
        <div className="fx-sign-frame" />
        <div className="fx-sign-word">ALCATEIA</div>
        <div className="fx-sign-rgb fx-sign-r" />
        <div className="fx-sign-rgb fx-sign-c" />
      </div>
    ),
  },
  laser: {
    name: "Varredura laser",
    swapMs: 600,
    totalMs: 1200,
    render: () => (
      <div className="fx">
        <div className="fx fx-las">
          <div className="fx-las-grid" />
        </div>
        <div className="fx-las-line" />
      </div>
    ),
  },
  blinds: {
    name: "Persianas neon",
    swapMs: 700,
    totalMs: 1550,
    render: () => (
      <div className="fx fx-bl">
        {strips.map((i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    ),
  },
  line: {
    name: "Abdução",
    swapMs: 1200,
    totalMs: 1700,
    render: () => (
      <div className="fx fx-line">
        <div className="fx-line-ln" />
      </div>
    ),
  },
};

/**
 * A escolha mora no store (`transition`, persistido em `localStorage`) e é feita no diálogo de perfil.
 * `?fx=<id>` na URL também a define (atalho de desenvolvimento); `?fx=default` volta ao padrão.
 * Lido no carregamento do módulo, antes de qualquer navegação interna perder a query.
 */
function readFromUrl() {
  const fx = new URLSearchParams(window.location.search).get("fx");
  if (isTransitionId(fx)) useGameStore.getState().setTransition(fx);
  else if (fx === "default") useGameStore.getState().setTransition(DEFAULT_TRANSITION);
}
readFromUrl();

export function getTransitionId(): TransitionId {
  const stored = useGameStore.getState().transition;
  return isTransitionId(stored) && stored in transitions ? stored : DEFAULT_TRANSITION;
}

export function PageTransition({ id }: { id: TransitionId }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {transitions[id].render()}
    </div>
  );
}
