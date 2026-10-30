import { describe, expect, it } from "vitest";
import { deal, maxLevel, mistakeReplay, nextLevel, play, removePlayer, startGame, type OrdemState } from "./ordem-silenciosa-rules";

const base = (hands: Record<string, number[]>, extra: Partial<OrdemState> = {}): OrdemState => ({
  level: 2,
  maxLevel: 12,
  lives: 3,
  hands,
  pile: [],
  status: "playing",
  lastMistake: null,
  ...extra,
});

describe("maxLevel e deal", () => {
  it("o último nível depende do número de jogadores", () => {
    expect([maxLevel(2), maxLevel(3), maxLevel(4), maxLevel(8)]).toEqual([12, 10, 8, 8]);
  });

  it("distribui cartas distintas, em ordem, de 1 a 100", () => {
    const hands = deal(["a", "b", "c"], 5);
    const all = Object.values(hands).flat();
    expect(Object.values(hands).every((hand) => hand.length === 5)).toBe(true);
    expect(new Set(all).size).toBe(15);
    expect(all.every((card) => card >= 1 && card <= 100)).toBe(true);
    expect(Object.values(hands).every((hand) => hand.every((card, i) => i === 0 || hand[i - 1] < card))).toBe(true);
  });

  it("começa no nível 1 com 3 vidas", () => {
    const state = startGame(["a", "b"]);
    expect(state).toMatchObject({ level: 1, lives: 3, status: "playing", maxLevel: 12 });
    expect(state.hands.a).toHaveLength(1);
  });
});

describe("play", () => {
  it("joga a carta mais baixa do jogador e acerta quando ninguém tem menor", () => {
    const next = play(base({ a: [10, 50], b: [30] }), "a");
    expect(next.hands).toEqual({ a: [50], b: [30] });
    expect(next.pile).toEqual([{ card: 10, by: "a" }]);
    expect(next.lives).toBe(3);
  });

  it("erro custa uma vida e descarta as cartas menores de todos", () => {
    const next = play(base({ a: [47, 90], b: [12, 30, 60], c: [40] }), "a");
    expect(next.lives).toBe(2);
    expect(next.hands).toEqual({ a: [90], b: [60], c: [] });
    expect(next.lastMistake).toEqual({ card: 47, by: "a", discarded: { b: [12, 30], c: [40] } });
  });

  it("nível concluído quando as mãos esvaziam; vitória no último nível", () => {
    expect(play(base({ a: [5], b: [] }), "a").status).toBe("level-done");
    expect(play(base({ a: [5], b: [] }, { level: 12 }), "a").status).toBe("won");
  });

  it("derrota quando as vidas acabam, mesmo esvaziando as mãos", () => {
    expect(play(base({ a: [50], b: [10] }, { lives: 1 }), "a")).toMatchObject({ status: "lost", lives: 0 });
  });

  it("ignora jogada sem cartas ou com a partida parada", () => {
    const state = base({ a: [], b: [3] });
    expect(play(state, "a")).toBe(state);
    const done = base({ a: [1] }, { status: "level-done" });
    expect(play(done, "a")).toBe(done);
  });
});

describe("nextLevel e removePlayer", () => {
  it("o próximo nível distribui uma carta a mais e limpa a pilha", () => {
    const next = nextLevel(base({ a: [], b: [] }, { status: "level-done", pile: [{ card: 3, by: "a" }] }), ["a", "b"]);
    expect(next).toMatchObject({ level: 3, status: "playing", pile: [], lastMistake: null });
    expect(next.hands.a).toHaveLength(3);
  });

  it("quem sai leva as cartas sem custar vida e pode fechar o nível", () => {
    const next = removePlayer(base({ a: [], b: [70] }), "b");
    expect(next).toMatchObject({ lives: 3, status: "level-done", hands: { a: [] } });
  });
});

describe("mistakeReplay", () => {
  it("mostra a ordem certa: jogadas, a carta antes da hora e as descartadas", () => {
    const afterFirst = play(base({ a: [5, 47], b: [12, 30], c: [40] }), "a");
    const state = play(afterFirst, "a");
    expect(mistakeReplay(state)).toEqual([
      { card: 5, by: "a", status: "ok" },
      { card: 12, by: "b", status: "missed" },
      { card: 30, by: "b", status: "missed" },
      { card: 40, by: "c", status: "missed" },
      { card: 47, by: "a", status: "early" },
    ]);
  });

  it("sem erro não há replay", () => {
    expect(mistakeReplay(base({ a: [1] }))).toEqual([]);
  });
});
