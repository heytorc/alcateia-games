/** Regras puras do Quem seria mais provável?: contagem dos votos de uma pergunta e placar acumulado. */

export type Person = { name: string; avatar: string };
/** Quem votou (id) → em quem votou (id). */
export type Votes = Record<string, string>;
export type Tally = { id: string; name: string; avatar: string; votes: number; rank: number };

/**
 * Ranking de uma lista de contagens: mais votos primeiro, empates dividem a posição e o nome desempata
 * a ordem de exibição. Quem não tem nome conhecido (saiu da sala) aparece como "Jogador que saiu".
 */
function rank(counts: Record<string, number>, people: Record<string, Person>): Tally[] {
  const entries = Object.entries(counts).map(([id, votes]) => ({
    id,
    name: people[id]?.name ?? "Jogador que saiu",
    avatar: people[id]?.avatar ?? "🐺",
    votes,
  }));
  return entries
    .map((entry) => ({ ...entry, rank: entries.filter((other) => other.votes > entry.votes).length + 1 }))
    .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name, "pt-BR"));
}

/** Votos de uma pergunta. Todos os jogadores aparecem, mesmo com 0 votos. */
export function tallyVotes(votes: Votes, people: Record<string, Person>): Tally[] {
  const counts: Record<string, number> = Object.fromEntries(Object.keys(people).map((id) => [id, 0]));
  for (const target of Object.values(votes)) counts[target] = (counts[target] ?? 0) + 1;
  return rank(counts, people);
}

/** Soma os votos de uma pergunta ao placar acumulado (id → total). */
export function addVotes(totals: Record<string, number>, votes: Votes): Record<string, number> {
  const next = { ...totals };
  for (const target of Object.values(votes)) next[target] = (next[target] ?? 0) + 1;
  return next;
}

/** Placar final da partida, do mais para o menos votado. */
export function finalStandings(totals: Record<string, number>, people: Record<string, Person>): Tally[] {
  return rank(totals, people);
}

/** Os mais votados (empatados no 1º lugar), ou vazio se ninguém recebeu voto. */
export function leaders(tally: Tally[]): Tally[] {
  return tally.filter((entry) => entry.rank === 1 && entry.votes > 0);
}
