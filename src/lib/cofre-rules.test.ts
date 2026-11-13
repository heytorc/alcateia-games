import { describe, expect, it } from "vitest";
import { applyGuess, createVault, exhausted, isOut, livesLeft, digitScores, drawCode, formatElapsed, revealedDigits, scoreGuess, visibleAttempts } from "./cofre-rules";

describe("cofre", () => {
  it("sorteia um código com a quantidade de dígitos pedida", () => {
    for (let i = 0; i < 50; i++) expect(drawCode(5)).toMatch(/^\d{5}$/);
  });

  it("marca cada posição como certa ou errada", () => {
    expect(scoreGuess("1234", "1294")).toEqual(["ok", "ok", "bad", "ok"]);
  });

  it("ignora tentativa inválida", () => {
    const v = createVault("1234", "shared");
    expect(applyGuess(v, "a", "12", 1)).toBe(v);
    expect(applyGuess(v, "a", "12ab", 1)).toBe(v);
  });

  it("qualquer jogador joga a qualquer momento e acertar abre o cofre", () => {
    let v = createVault("1234", "shared");
    v = applyGuess(v, "b", "0000", 100);
    v = applyGuess(v, "a", "1234", 900);
    expect(v.solvedBy).toBe("a");
    expect(v.solvedMs).toBe(900);
  });

  it("depois de aberto, só uma resposta certa mais rápida troca o vencedor", () => {
    let v = applyGuess(createVault("1234", "shared"), "a", "1234", 900);
    expect(applyGuess(v, "b", "0000", 950)).toBe(v);
    expect(applyGuess(v, "b", "1234", 1000)).toBe(v);
    v = applyGuess(v, "b", "1234", 700);
    expect(v.solvedBy).toBe("b");
    expect(v.solvedMs).toBe(700);
  });

  it("modo compartilhado mostra os acertos de todos; individual só os do jogador", () => {
    const play = (mode: "shared" | "individual") => {
      let v = createVault("1234", mode);
      v = applyGuess(v, "a", "1000", 1);
      v = applyGuess(v, "b", "0230", 2);
      return v;
    };
    expect(revealedDigits(play("shared"), "a")).toEqual(["1", "2", "3", null]);
    expect(revealedDigits(play("individual"), "a")).toEqual(["1", null, null, null]);
    expect(visibleAttempts(play("individual"), "b")).toHaveLength(1);
  });

  it("pontua por posições: primeiro a acertar (compartilhado) ou posições distintas (individual)", () => {
    const run = (mode: "shared" | "individual") => {
      let v = createVault("1234", mode);
      v = applyGuess(v, "a", "1000", 1);
      v = applyGuess(v, "b", "1234", 2);
      return digitScores(v, ["a", "b"]);
    };
    expect(run("shared")).toEqual({ a: 1, b: 3 });
    expect(run("individual")).toEqual({ a: 1, b: 4 });
  });

  it("formata o tempo", () => {
    expect(formatElapsed(12_340)).toBe("12,3s");
    expect(formatElapsed(83_400)).toBe("1:23,4");
  });

  it("com vidas, cada erro tira uma e quem zera não joga mais", () => {
    let v = createVault("1234", "shared", ["a", "b"], 2);
    v = applyGuess(v, "a", "0000", 1);
    expect(livesLeft(v, "a")).toBe(1);
    expect(livesLeft(v, "b")).toBe(2);
    v = applyGuess(v, "a", "0000", 2);
    expect(isOut(v, "a")).toBe(true);
    expect(applyGuess(v, "a", "1234", 3)).toBe(v);
    expect(exhausted(v)).toBe(false);
    v = applyGuess(applyGuess(v, "b", "0000", 4), "b", "1111", 5);
    expect(exhausted(v)).toBe(true);
  });

  it("sem vidas configuradas as tentativas são ilimitadas, e acertar não custa vida", () => {
    let v = createVault("1234", "shared", ["a"]);
    for (let i = 0; i < 20; i++) v = applyGuess(v, "a", "0000", i);
    expect(isOut(v, "a")).toBe(false);
    expect(livesLeft(v, "a")).toBeNull();
    const w = applyGuess(createVault("1234", "shared", ["a"], 1), "a", "1234", 5);
    expect(livesLeft(w, "a")).toBe(1);
    expect(exhausted(w)).toBe(false);
  });
});
