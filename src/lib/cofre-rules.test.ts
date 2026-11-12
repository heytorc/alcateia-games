import { describe, expect, it } from "vitest";
import { applyGuess, skipTurn, createVault, currentPlayerId, digitScores, drawCode, revealedDigits, scoreGuess, visibleAttempts } from "./cofre-rules";

describe("cofre", () => {
  it("sorteia um código com a quantidade de dígitos pedida", () => {
    for (let i = 0; i < 50; i++) expect(drawCode(5)).toMatch(/^\d{5}$/);
  });

  it("marca cada posição como certa ou errada", () => {
    expect(scoreGuess("1234", "1294")).toEqual(["ok", "ok", "bad", "ok"]);
  });

  it("só o jogador da vez joga, e a vez passa em ciclo", () => {
    let v = createVault("1234", "shared", ["a", "b"]);
    expect(applyGuess(v, "b", "0000")).toBe(v);
    v = applyGuess(v, "a", "0000");
    expect(currentPlayerId(v)).toBe("b");
    v = applyGuess(v, "b", "0000");
    expect(currentPlayerId(v)).toBe("a");
  });

  it("ignora tentativa inválida e repetida (n atrasado)", () => {
    const v = createVault("1234", "shared", ["a", "b"]);
    expect(applyGuess(v, "a", "12")).toBe(v);
    expect(applyGuess(v, "a", "12ab")).toBe(v);
    expect(applyGuess(v, "a", "0000", 3)).toBe(v);
  });

  it("acertar o código abre o cofre e encerra as vezes", () => {
    const v = applyGuess(createVault("1234", "shared", ["a", "b"]), "a", "1234");
    expect(v.solvedBy).toBe("a");
    expect(currentPlayerId(v)).toBeNull();
  });

  it("modo compartilhado mostra os acertos de todos; individual só os do jogador", () => {
    const play = (mode: "shared" | "individual") => {
      let v = createVault("1234", mode, ["a", "b"]);
      v = applyGuess(v, "a", "1000");
      v = applyGuess(v, "b", "0230");
      return v;
    };
    expect(revealedDigits(play("shared"), "a")).toEqual(["1", "2", "3", null]);
    expect(revealedDigits(play("individual"), "a")).toEqual(["1", null, null, null]);
    expect(visibleAttempts(play("individual"), "b")).toHaveLength(1);
  });

  it("pontua por posições: primeiro a acertar (compartilhado) ou posições distintas (individual)", () => {
    let shared = createVault("1234", "shared", ["a", "b"]);
    shared = applyGuess(shared, "a", "1000");
    shared = applyGuess(shared, "b", "1234");
    expect(digitScores(shared, ["a", "b"])).toEqual({ a: 1, b: 3 });
    let solo = createVault("1234", "individual", ["a", "b"]);
    solo = applyGuess(solo, "a", "1000");
    solo = applyGuess(solo, "b", "1234");
    expect(digitScores(solo, ["a", "b"])).toEqual({ a: 1, b: 4 });
  });

  it("pula a vez de quem sumiu, uma única vez por turno", () => {
    const v = createVault("1234", "shared", ["a", "b"]);
    const after = skipTurn(v, 0);
    expect(currentPlayerId(after)).toBe("b");
    expect(skipTurn(after, 0)).toBe(after);
    expect(after.attempts).toHaveLength(0);
  });
});
