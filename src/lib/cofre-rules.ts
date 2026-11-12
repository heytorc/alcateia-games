/** Regras puras do Cofre: sorteio do código, conferência de cada tentativa, vez dos jogadores e pontuação. */
import { randomInteger } from "@/lib/utils";

export const MIN_DIGITS = 3;
export const MAX_DIGITS = 8;

/** `shared`: o que um jogador acerta fica à vista de todos. `individual`: cada um só vê os próprios acertos. */
export type VaultMode = "shared" | "individual";
export type Mark = "ok" | "bad";
export type Attempt = { playerId: string; guess: string; marks: Mark[] };

export type Vault = {
  code: string;
  digits: number;
  mode: VaultMode;
  /** Ordem de jogada sorteada; a vez volta ao primeiro depois do último. */
  order: string[];
  turn: number;
  attempts: Attempt[];
  solvedBy: string | null;
};

/** Código de `digits` dígitos, com zeros à esquerda permitidos. */
export const drawCode = (digits: number) =>
  Array.from({ length: digits }, () => String(randomInteger(0, 9))).join("");

/** Marca cada posição da tentativa como certa ou errada. */
export const scoreGuess = (code: string, guess: string): Mark[] =>
  Array.from(code, (digit, index) => (guess[index] === digit ? "ok" : "bad"));

export function createVault(code: string, mode: VaultMode, order: string[]): Vault {
  return { code, digits: code.length, mode, order, turn: 0, attempts: [], solvedBy: null };
}

export const currentPlayerId = (v: Vault) => (v.solvedBy ? null : (v.order[v.turn % v.order.length] ?? null));

/**
 * Registra a tentativa do jogador da vez e passa a vez. `n` (número de tentativas que o emissor via)
 * descarta uma jogada repetida ou atrasada. Tentativa inválida devolve o mesmo cofre.
 */
export function applyGuess(v: Vault, playerId: string, guess: string, n?: number): Vault {
  if (currentPlayerId(v) !== playerId || (n !== undefined && n !== v.attempts.length)) return v;
  if (guess.length !== v.digits || !/^\d+$/.test(guess)) return v;
  const marks = scoreGuess(v.code, guess);
  const solved = marks.every((mark) => mark === "ok");
  return {
    ...v,
    attempts: [...v.attempts, { playerId, guess, marks }],
    turn: v.turn + 1,
    solvedBy: solved ? playerId : null,
  };
}

/** Passa a vez de quem sumiu da sala, sem tentativa. `turn` descarta um pedido repetido ou atrasado. */
export function skipTurn(v: Vault, turn: number): Vault {
  return v.solvedBy || turn !== v.turn ? v : { ...v, turn: v.turn + 1 };
}

/** Tentativas que o jogador pode ver: todas no modo compartilhado, só as dele no individual. */
export const visibleAttempts = (v: Vault, viewerId: string) =>
  v.mode === "shared" ? v.attempts : v.attempts.filter((attempt) => attempt.playerId === viewerId);

/** Dígitos já descobertos (`null` = ainda escondido) na visão do jogador. */
export function revealedDigits(v: Vault, viewerId: string): Array<string | null> {
  const found = new Set<number>();
  for (const attempt of visibleAttempts(v, viewerId))
    attempt.marks.forEach((mark, index) => mark === "ok" && found.add(index));
  return Array.from(v.code, (digit, index) => (found.has(index) ? digit : null));
}

/**
 * Posições que cada jogador acertou. No modo compartilhado conta quem acertou a posição primeiro; no
 * individual, as posições distintas que o jogador acertou. Quem abriu o cofre tem todas.
 */
export function digitScores(v: Vault, ids: readonly string[]): Record<string, number> {
  const scores = Object.fromEntries(ids.map((id) => [id, 0]));
  const claimed = new Set<number>();
  const own = new Map<string, Set<number>>();
  for (const attempt of v.attempts) {
    const mine = own.get(attempt.playerId) ?? new Set<number>();
    own.set(attempt.playerId, mine);
    attempt.marks.forEach((mark, index) => {
      if (mark !== "ok") return;
      if (v.mode === "shared") {
        if (claimed.has(index)) return;
        claimed.add(index);
        scores[attempt.playerId] = (scores[attempt.playerId] ?? 0) + 1;
      } else if (!mine.has(index)) {
        mine.add(index);
        scores[attempt.playerId] = (scores[attempt.playerId] ?? 0) + 1;
      }
    });
  }
  return scores;
}
