import type { CSSProperties } from "react";

// s: tamanho (px), d: atraso (s), dx/dy: tremor. 0 = cabeça do curto; 1–5 = rastro; 6+ = fagulhas que saltam.
const PARTICLES = [
  [8, 0, 0, 0], [6, 0.02, 0, 0], [5, 0.04, 0, 0], [4, 0.06, 0, 0], [3, 0.08, 0, 0], [2, 0.1, 0, 0],
  [3, 0.03, 9, -7], [2, 0.05, -8, 9], [3, 0.07, 11, 6], [2, 0.09, -10, -8], [3, 0.12, 7, 11], [2, 0.14, -12, 5],
] as const;

/** Curto-circuito que percorre a borda do `.neon-box` pai (precisa de `relative`). Reinicia a cada `trigger`. */
export function NeonSpark({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;
  return (
    <span key={trigger} aria-hidden className="neon-spark">
      {PARTICLES.map(([s, d, dx, dy], i) => (
        <i key={i} style={{ "--s": `${s}px`, "--d": `${d}s`, "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties} />
      ))}
    </span>
  );
}
