import { describe, expect, it } from "vitest";
import { addVotes, finalStandings, leaders, tallyVotes } from "./provavel-rules";

const people = { a: { name: "Ana", avatar: "🐼" }, b: { name: "Beto", avatar: "🦊" }, c: { name: "Caio", avatar: "🐺" } };

describe("tallyVotes", () => {
  it("conta os votos, inclui quem não recebeu voto e ordena", () => {
    const tally = tallyVotes({ a: "b", b: "b", c: "a" }, people);
    expect(tally.map(({ id, votes, rank }) => [id, votes, rank])).toEqual([
      ["b", 2, 1],
      ["a", 1, 2],
      ["c", 0, 3],
    ]);
  });

  it("votar em si mesmo vale", () => {
    expect(tallyVotes({ a: "a" }, people)[0]).toMatchObject({ id: "a", votes: 1, rank: 1 });
  });

  it("empate divide a posição e quem saiu da sala continua contando", () => {
    const tally = tallyVotes({ a: "b", b: "x" }, people);
    expect(leaders(tally).map((entry) => entry.name)).toEqual(["Beto", "Jogador que saiu"]);
  });
});

describe("addVotes e finalStandings", () => {
  it("acumula entre perguntas", () => {
    const totals = addVotes(addVotes({}, { a: "b", b: "c" }), { a: "b", c: "b" });
    expect(totals).toEqual({ b: 3, c: 1 });
    expect(finalStandings(totals, people).map((entry) => entry.id)).toEqual(["b", "c"]);
  });

  it("sem votos não há mais votado", () => {
    expect(leaders(tallyVotes({}, people))).toEqual([]);
  });
});
