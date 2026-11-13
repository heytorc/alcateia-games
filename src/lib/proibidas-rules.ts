/** Regras puras do Palavras Proibidas: ordem de cada rodada, cartas, vez de cada descritor e pódio por acertos. */
import { drawManyUnique } from "@/lib/utils";

/**
 * Sorteia `count` cartas priorizando as que ainda não saíram (`used`, por palavra). Se as inéditas
 * não bastarem, completa com as já usadas. Devolve as cartas e o novo histórico.
 */
export function drawCards<T extends { word: string }>(cards: readonly T[], used: readonly string[], count: number) {
  const usedSet = new Set(used);
  const fresh = cards.filter((card) => !usedSet.has(card.word));
  const picked =
    fresh.length >= count
      ? drawManyUnique(fresh, count)
      : [...drawManyUnique(fresh, fresh.length), ...drawManyUnique(cards.filter((card) => usedSet.has(card.word)), count - fresh.length)];
  const nextUsed = fresh.length >= count ? [...used, ...picked.map((card) => card.word)] : picked.map((card) => card.word);
  return { picked, used: nextUsed };
}

/**
 * Uma rodada: cada jogador descreve uma carta, na ordem sorteada. `hits` acumula os acertos da partida
 * (quem adivinhou pontua; quem descreve não).
 */
export type TabooRound<T> = { round: number; order: string[]; cards: T[]; turn: number; hits: Record<string, number> };

/** Sorteia a ordem e uma carta por jogador. Devolve a rodada e o novo histórico de cartas usadas. */
export function buildRound<T extends { word: string }>(
  round: number,
  playerIds: readonly string[],
  pool: readonly T[],
  used: readonly string[],
  hits: Record<string, number>,
) {
  const order = drawManyUnique(playerIds, playerIds.length);
  const drawn = drawCards(pool, used, order.length);
  return { state: { round, order, cards: drawn.picked, turn: 0, hits } as TabooRound<T>, used: drawn.used };
}

export const describerId = <T>(r: TabooRound<T>) => r.order[r.turn] ?? null;
export const currentCard = <T>(r: TabooRound<T>) => r.cards[r.turn] ?? null;
export const roundOver = <T>(r: TabooRound<T>) => r.turn >= r.order.length;

/**
 * Fecha a vez do descritor: `guesserId` ganha um ponto (`null` = ninguém acertou ou o tempo acabou) e a vez
 * passa ao próximo. Só vale para a vez em curso (`turn`), então um resultado repetido ou atrasado é ignorado.
 */
export function resolveTurn<T>(r: TabooRound<T>, turn: number, guesserId: string | null): TabooRound<T> {
  if (roundOver(r) || turn !== r.turn) return r;
  const scores = guesserId && guesserId !== describerId(r) ? { ...r.hits, [guesserId]: (r.hits[guesserId] ?? 0) + 1 } : r.hits;
  return { ...r, turn: r.turn + 1, hits: scores };
}

export type Standing = { id: string; hits: number; rank: number };

/** Pódio do maior para o menor número de acertos; empates dividem a posição. */
export function standings(hits: Record<string, number>, ids: readonly string[]): Standing[] {
  const scored = ids.map((id) => ({ id, hits: hits[id] ?? 0 }));
  return scored
    .map((entry) => ({ ...entry, rank: scored.filter((other) => other.hits > entry.hits).length + 1 }))
    .sort((left, right) => left.rank - right.rank);
}
