import { describe, expect, it } from "vitest";
import { brParaIso, hojeEmBrasilia, isoParaBr } from "./datas";

describe("datas", () => {
  it("converte ISO ↔ dd/mm/aaaa", () => {
    expect(isoParaBr("2026-10-20")).toBe("20/10/2026");
    expect(brParaIso(" 20/10/2026 ")).toBe("2026-10-20");
  });

  it("mantém texto que não é data para o domínio sinalizar", () => {
    expect(isoParaBr("ontem")).toBe("ontem");
    expect(brParaIso("2026/10/20")).toBe("2026/10/20");
  });

  it("usa o dia de Brasília", () => {
    expect(hojeEmBrasilia(new Date("2026-10-28T02:00:00Z"))).toBe("2026-10-27");
    expect(hojeEmBrasilia(new Date("2026-10-28T15:00:00Z"))).toBe("2026-10-28");
  });
});
