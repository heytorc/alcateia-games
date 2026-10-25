/** Regras puras do Reflexo: espera aleatória, classificação do toque e placar por tempo acumulado. */

export const MIN_WAIT_MS = 2_000;
export const MAX_WAIT_MS = 6_000;
/** Depois disso sem tocar, a rodada conta como lenta (e o lobo fica triste). */
export const MAX_REACTION_MS = 1_500;
/** Tocar antes do bife pune mais que a reação mais lenta possível. */
export const FALSE_START_MS = 2_000;

export type TapResult = { kind: "hit" | "slow" | "false-start"; ms: number };

/** Espera sorteada pelo anfitrião, em ms inteiros dentro de [MIN_WAIT_MS, MAX_WAIT_MS]. */
export function drawWaitMs(random = Math.random) {
  return MIN_WAIT_MS + Math.floor(random() * (MAX_WAIT_MS - MIN_WAIT_MS + 1));
}

/**
 * Classifica um toque (`tapAt`) em relação ao instante em que o bife apareceu (`steakAt`,
 * `null` enquanto ainda não apareceu). Ambos em `performance.now()` do próprio aparelho.
 */
export function classifyTap(tapAt: number, steakAt: number | null): TapResult {
  if (steakAt === null || tapAt < steakAt) return { kind: "false-start", ms: FALSE_START_MS };
  const reaction = tapAt - steakAt;
  return reaction > MAX_REACTION_MS ? { kind: "slow", ms: MAX_REACTION_MS } : { kind: "hit", ms: reaction };
}
