import { describe, expect, it } from "vitest";
import { pickHint } from "./impostor-rules";

describe("pickHint", () => {
  it("devolve uma palavra vizinha da mesma lista", () => {
    const near = ["ABACAXI", "MELANCIA", "MANGA", "LARANJA", "LIMÃO", "COCO"];
    for (let i = 0; i < 30; i++) expect(near).toContain(pickHint("UVA"));
  });

  it("devolve null para palavra fora do catálogo", () => {
    expect(pickHint("PALAVRA-INEXISTENTE")).toBeNull();
  });
});
