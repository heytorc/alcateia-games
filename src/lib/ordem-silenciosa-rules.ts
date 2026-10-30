/**
 * Regras puras da Ordem Silenciosa (cooperativo, inspirado em The Mind): no nível N cada jogador recebe
 * N cartas de 1 a 100 e o grupo precisa jogá-las em ordem crescente, sem combinar. Cada um só joga a sua
 * carta mais baixa. Jogar uma carta enquanto alguém ainda tem uma menor custa uma vida, e as cartas menores
 * que a jogada são descartadas. O anfitrião aplica estas funções e transmite o estado.
 */

export const MAX_CARD = 100;
export const STARTING_LIVES = 3;

export type Status = "playing" | "level-done" | "won" | "lost";
export type Mistake = { card: number; by: string; discarded: Record<string, number[]> };
export type OrdemState = {
  level: number;
  maxLevel: number;
  lives: number;
  /** Mão de cada jogador, sempre em ordem crescente. */
  hands: Record<string, number[]>;
  /** Cartas jogadas no nível, na ordem em que saíram. */
  pile: { card: number; by: string }[];
  status: Status;
  /** O último erro do nível, para a tela explicar o que aconteceu. */
  lastMistake: Mistake | null;
};

/** Último nível conforme o número de jogadores: 2 → 12, 3 → 10, 4 ou mais → 8. */
export function maxLevel(players: number) {
  return players <= 2 ? 12 : players === 3 ? 10 : 8;
}

/** Distribui `level` cartas distintas (1–100) para cada jogador. */
export function deal(playerIds: readonly string[], level: number, random = Math.random): Record<string, number[]> {
  const deck = Array.from({ length: MAX_CARD }, (_, index) => index + 1);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return Object.fromEntries(
    playerIds.map((id, index) => [id, deck.slice(index * level, (index + 1) * level).sort((a, b) => a - b)]),
  );
}

export function startGame(playerIds: readonly string[], random = Math.random): OrdemState {
  return {
    level: 1,
    maxLevel: maxLevel(playerIds.length),
    lives: STARTING_LIVES,
    hands: deal(playerIds, 1, random),
    pile: [],
    status: "playing",
    lastMistake: null,
  };
}

export function nextLevel(state: OrdemState, playerIds: readonly string[], random = Math.random): OrdemState {
  const level = state.level + 1;
  return { ...state, level, hands: deal(playerIds, level, random), pile: [], status: "playing", lastMistake: null };
}

/** Nível acabou (ninguém tem carta) ou partida acabou (vidas zeradas / último nível concluído). */
function settle(state: OrdemState): OrdemState {
  if (state.lives <= 0) return { ...state, lives: 0, status: "lost" };
  if (Object.values(state.hands).every((hand) => hand.length === 0))
    return { ...state, status: state.level >= state.maxLevel ? "won" : "level-done" };
  return state;
}

/**
 * O jogador joga a sua carta mais baixa. Se outra mão tinha carta menor, o grupo perde uma vida e todas
 * as cartas menores que a jogada saem do jogo. Jogada fora de hora (sem cartas, partida parada) é ignorada.
 */
export function play(state: OrdemState, playerId: string): OrdemState {
  const hand = state.hands[playerId];
  if (state.status !== "playing" || !hand?.length) return state;
  const card = hand[0];
  const discarded: Record<string, number[]> = {};
  const hands: Record<string, number[]> = {};
  for (const [id, cards] of Object.entries(state.hands)) {
    const rest = id === playerId ? cards.slice(1) : cards;
    const lower = rest.filter((value) => value < card);
    if (lower.length) discarded[id] = lower;
    hands[id] = rest.filter((value) => value > card);
  }
  const mistake = Object.keys(discarded).length > 0;
  return settle({
    ...state,
    hands,
    pile: [...state.pile, { card, by: playerId }],
    lives: mistake ? state.lives - 1 : state.lives,
    lastMistake: mistake ? { card, by: playerId, discarded } : state.lastMistake,
  });
}

/** Tira da partida quem saiu da sala: as cartas dele somem, sem custar vida. */
export function removePlayer(state: OrdemState, playerId: string): OrdemState {
  if (!(playerId in state.hands)) return state;
  const hands = { ...state.hands };
  delete hands[playerId];
  return state.status === "playing" ? settle({ ...state, hands }) : { ...state, hands };
}

export type ReplayEntry = { card: number; by: string; status: "ok" | "early" | "missed" };

/**
 * Replay do último erro na ordem certa: as cartas jogadas no nível até o erro, a que foi jogada antes da
 * hora ("early") e as que deveriam ter saído antes e foram descartadas ("missed"), em ordem crescente.
 */
export function mistakeReplay(state: OrdemState): ReplayEntry[] {
  const mistake = state.lastMistake;
  if (!mistake) return [];
  const until = state.pile.findIndex((entry) => entry.card === mistake.card);
  const played = (until === -1 ? state.pile : state.pile.slice(0, until + 1)).map((entry) => ({
    ...entry,
    status: entry.card === mistake.card ? ("early" as const) : ("ok" as const),
  }));
  const missed = Object.entries(mistake.discarded).flatMap(([by, cards]) =>
    cards.map((card) => ({ card, by, status: "missed" as const })),
  );
  return [...played, ...missed].sort((left, right) => left.card - right.card);
}
