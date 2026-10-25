import { describe, expect, it } from "vitest";
import { drawCards, MAX_PARTICIPANTS, participantError, standings } from "./proibidas-rules";

describe("participantError", () => {
  it("aceita um nome novo", () => {
    expect(participantError("  Ana ", ["Beto"])).toBeNull();
  });

  it("recusa vazio, repetido (sem diferenciar maiúsculas) e lista cheia", () => {
    expect(participantError("   ", [])).not.toBeNull();
    expect(participantError("ana", ["Ana"])).not.toBeNull();
    expect(participantError("Zé", Array.from({ length: MAX_PARTICIPANTS }, (_, i) => `P${i}`))).not.toBeNull();
  });
});

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

describe("standings", () => {
  it("ordena por acertos e empates dividem a posição", () => {
    expect(standings({ Ana: 3, Beto: 5, Caio: 3 }, ["Ana", "Beto", "Caio", "Dani"])).toEqual([
      { name: "Beto", hits: 5, rank: 1 },
      { name: "Ana", hits: 3, rank: 2 },
      { name: "Caio", hits: 3, rank: 2 },
      { name: "Dani", hits: 0, rank: 4 },
    ]);
  });
});
