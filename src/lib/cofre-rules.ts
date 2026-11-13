/** Regras puras do Cofre: sorteio do código, conferência de cada tentativa, tempo e pontuação. Todos jogam ao mesmo tempo. */
import { randomInteger } from "@/lib/utils";

export const MIN_DIGITS = 3;
export const MAX_DIGITS = 8;

/** `shared`: o que um jogador acerta fica à vista de todos. `individual`: cada um só vê os próprios acertos. */
export type VaultMode = "shared" | "individual";
export type Mark = "ok" | "bad";
/** `ms`: tempo desde a largada, medido por quem digitou. */
export type Attempt = { playerId: string; guess: string; marks: Mark[]; ms: number };

export type Vault = {
  code: string;
  digits: number;
  mode: VaultMode;
  attempts: Attempt[];
  solvedBy: string | null;
  solvedMs: number | null;
  /** Vidas por jogador (cada combinação errada tira uma); `null` = tentativas ilimitadas. */
  lives: Record<string, number> | null;
};

/** Código de `digits` dígitos, com zeros à esquerda permitidos. */
export const drawCode = (digits: number) =>
  Array.from({ length: digits }, () => String(randomInteger(0, 9))).join("");

/** Marca cada posição da tentativa como certa ou errada. */
export const scoreGuess = (code: string, guess: string): Mark[] =>
  Array.from(code, (digit, index) => (guess[index] === digit ? "ok" : "bad"));

export const createVault = (code: string, mode: VaultMode, playerIds: readonly string[] = [], maxLives: number | null = null): Vault => ({
  code, digits: code.length, mode, attempts: [], solvedBy: null, solvedMs: null,
  lives: maxLives === null ? null : Object.fromEntries(playerIds.map((id) => [id, maxLives])),
});

/** Vidas que sobram ao jogador; `null` com tentativas ilimitadas. Quem não estava na largada fica sem vidas. */
export const livesLeft = (v: Vault, id: string): number | null => (v.lives ? (v.lives[id] ?? 0) : null);

/** Jogador sem vidas não joga mais. */
export const isOut = (v: Vault, id: string) => v.lives !== null && (v.lives[id] ?? 0) <= 0;

/** Ninguém abriu o cofre e todos ficaram sem vidas. */
export const exhausted = (v: Vault) => v.lives !== null && !v.solvedBy && Object.values(v.lives).every((n) => n <= 0);

/**
 * Registra a tentativa de qualquer jogador. Depois de aberto, só uma tentativa certa mais rápida
 * (`ms` menor) troca quem abriu: eventos que chegam em ordem diferente convergem para o mesmo vencedor.
 */
export function applyGuess(v: Vault, playerId: string, guess: string, ms: number): Vault {
  if (guess.length !== v.digits || !/^\d+$/.test(guess) || isOut(v, playerId)) return v;
  const marks = scoreGuess(v.code, guess);
  const solved = marks.every((mark) => mark === "ok");
  if (v.solvedBy && !(solved && ms < (v.solvedMs ?? Infinity))) return v;
  return {
    ...v,
    attempts: [...v.attempts, { playerId, guess, marks, ms }],
    solvedBy: solved ? playerId : v.solvedBy,
    solvedMs: solved ? ms : v.solvedMs,
    lives: v.lives && !solved ? { ...v.lives, [playerId]: v.lives[playerId] - 1 } : v.lives,
  };
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
 * Posições que cada jogador acertou. No modo compartilhado conta quem acertou a posição primeiro (menor
 * `ms`); no individual, as posições distintas que o jogador acertou.
 */
export function digitScores(v: Vault, ids: readonly string[]): Record<string, number> {
  const scores = Object.fromEntries(ids.map((id) => [id, 0]));
  const claimed = new Set<number>();
  const own = new Map<string, Set<number>>();
  for (const attempt of [...v.attempts].sort((a, b) => a.ms - b.ms)) {
    const mine = own.get(attempt.playerId) ?? new Set<number>();
    own.set(attempt.playerId, mine);
    attempt.marks.forEach((mark, index) => {
      if (mark !== "ok") return;
      const taken = v.mode === "shared" ? claimed : mine;
      if (taken.has(index)) return;
      taken.add(index);
      scores[attempt.playerId] = (scores[attempt.playerId] ?? 0) + 1;
    });
  }
  return scores;
}

/** Tempo no formato 1:23,4 (minutos opcionais). */
export function formatElapsed(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100)
  const minutes = Math.floor(tenths / 600)
  const seconds = Math.floor((tenths % 600) / 10)
  const rest = tenths % 10
  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")},${rest}` : `${seconds},${rest}s`
}
