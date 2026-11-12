import { describe, expect, it } from "vitest";
import { impostorCategories } from "@/constants/impostor-words";
import { pickHint } from "./impostor-rules";

describe("pickHint", () => {
  it("devolve outra palavra da mesma categoria", () => {
    const hint = pickHint("PRAIA");
    expect(hint).not.toBe("PRAIA");
    expect(impostorCategories.lugares).toContain(hint);
  });

  it("devolve null para palavra fora do catálogo", () => {
    expect(pickHint("PALAVRA-INEXISTENTE")).toBeNull();
  });
});
