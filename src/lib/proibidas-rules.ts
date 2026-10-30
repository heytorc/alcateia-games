/** Regras puras do Palavras Proibidas: participantes, sorteio das cartas e pódio por acertos. */
import { drawManyUnique } from "@/lib/utils";

export const MAX_PARTICIPANTS = 12;
export const MAX_NAME_LENGTH = 20;

/** Erro de validação do nome a incluir, ou `null` se ele pode entrar na lista. */
export function participantError(name: string, participants: readonly string[]) {
  const trimmed = name.trim();
  if (!trimmed) return "Digite um nome.";
  if (trimmed.length > MAX_NAME_LENGTH) return `Use até ${MAX_NAME_LENGTH} caracteres.`;
  if (participants.some((other) => other.toLocaleLowerCase("pt-BR") === trimmed.toLocaleLowerCase("pt-BR")))
    return "Esse nome já está na lista.";
  if (participants.length >= MAX_PARTICIPANTS) return `No máximo ${MAX_PARTICIPANTS} participantes.`;
  return null;
}

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

export type Standing = { name: string; hits: number; rank: number };

/** Pódio do maior para o menor número de acertos; empates dividem a posição. */
export function standings(hits: Record<string, number>, participants: readonly string[]): Standing[] {
  const scored = participants.map((name) => ({ name, hits: hits[name] ?? 0 }));
  return scored
    .map((entry) => ({ ...entry, rank: scored.filter((other) => other.hits > entry.hits).length + 1 }))
    .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name, "pt-BR"));
}
