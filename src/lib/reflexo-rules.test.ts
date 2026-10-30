import { describe, expect, it } from "vitest";
import { classifyTap, drawWaitMs, FALSE_START_MS, MAX_REACTION_MS, MAX_WAIT_MS, MIN_WAIT_MS } from "./reflexo-rules";

describe("drawWaitMs", () => {
  it("fica entre a espera mínima e a máxima", () => {
    expect(drawWaitMs(() => 0)).toBe(MIN_WAIT_MS);
    expect(drawWaitMs(() => 0.999999)).toBe(MAX_WAIT_MS);
    expect(Number.isInteger(drawWaitMs(() => 0.5))).toBe(true);
  });
});

describe("classifyTap", () => {
  it("antes do bife é largada falsa", () => {
    expect(classifyTap(100, null)).toEqual({ kind: "false-start", ms: FALSE_START_MS });
    expect(classifyTap(99, 100)).toEqual({ kind: "false-start", ms: FALSE_START_MS });
  });

  it("depois do bife conta o tempo de reação", () => {
    expect(classifyTap(1_350, 1_000)).toEqual({ kind: "hit", ms: 350 });
    expect(classifyTap(1_000 + MAX_REACTION_MS, 1_000)).toEqual({ kind: "hit", ms: MAX_REACTION_MS });
  });

  it("além do limite é lento, com o tempo máximo", () => {
    expect(classifyTap(1_000 + MAX_REACTION_MS + 1, 1_000)).toEqual({ kind: "slow", ms: MAX_REACTION_MS });
  });

  it("largada falsa pune mais que a reação mais lenta", () => {
    expect(FALSE_START_MS).toBeGreaterThan(MAX_REACTION_MS);
  });
});
