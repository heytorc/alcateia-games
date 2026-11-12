import { describe, expect, it } from "vitest";
import { buildRound, currentCard, describerId, drawCards, resolveTurn, roundOver, standings } from "./proibidas-rules";

describe("drawCards", () => {
  const cards = ["A", "B", "C", "D"].map((word) => ({ word }));

  it("prioriza cartas inéditas e acumula o histórico", () => {
    const { picked, used } = drawCards(cards, ["A", "B"], 2);
    expect(picked.map((card) => card.word).sort()).toEqual(["C", "D"]);
    expect(used.sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("completa com as usadas e recomeça o histórico quando faltam inéditas", () => {
    const { picked, used } = drawCards(cards, ["A", "B", "C"], 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((card) => card.word)).size).toBe(3);
    expect(picked.map((card) => card.word)).toContain("D");
    expect(used).toHaveLength(3);
  });
});

describe("buildRound", () => {
  const pool = ["A", "B", "C", "D", "E"].map((word) => ({ word, forbidden: [] as string[] }));

  it("sorteia uma carta por jogador e começa pelo primeiro da ordem", () => {
    const { state, used } = buildRound(1, ["a", "b", "c"], pool, [], {});
    expect([...state.order].sort()).toEqual(["a", "b", "c"]);
    expect(state.cards).toHaveLength(3);
    expect(new Set(state.cards.map((card) => card.word)).size).toBe(3);
    expect(used).toHaveLength(3);
    expect(describerId(state)).toBe(state.order[0]);
    expect(currentCard(state)).toBe(state.cards[0]);
  });
});

describe("resolveTurn", () => {
  const base = () => buildRound(1, ["a", "b", "c"], [{ word: "X" }, { word: "Y" }, { word: "Z" }], [], { a: 1 }).state;

  it("pontua quem acertou, passa a vez e termina a rodada depois do último", () => {
    let round = base();
    const [first, second, third] = round.order;
    round = resolveTurn(round, 0, second);
    expect(round.hits[second]).toBe((base().hits[second] ?? 0) + 1);
    expect(describerId(round)).toBe(second);
    round = resolveTurn(round, 1, null);
    round = resolveTurn(round, 2, first);
    expect(roundOver(round)).toBe(true);
    expect(describerId(round)).toBeNull();
    expect(round.hits[third] ?? 0).toBe(third === "a" ? 1 : 0);
  });

  it("ignora resultado de vez que já passou e acerto do próprio descritor", () => {
    const round = base();
    const after = resolveTurn(round, 0, null);
    expect(resolveTurn(after, 0, "b")).toBe(after);
    const self = resolveTurn(round, 0, describerId(round));
    expect(self.hits).toEqual(round.hits);
    expect(self.turn).toBe(1);
  });
});

describe("standings", () => {
  it("ordena por acertos e empata na mesma posição", () => {
    const list = standings({ a: 2, b: 2, c: 1 }, ["c", "a", "b", "d"]);
    expect(list.map((entry) => entry.rank)).toEqual([1, 1, 3, 4]);
    expect(list[2].id).toBe("c");
    expect(list[3]).toEqual({ id: "d", hits: 0, rank: 4 });
  });
});
