import { describe, expect, it } from "vitest";
import { centavosParaDecimal, formatarReais, paraCentavos } from "./dinheiro";

describe("paraCentavos", () => {
  it.each([
    [12.34, 1234],
    [0.1 + 0.2, 30],
    [19.999, 2000],
    [1.005, 101],
    [0, 0],
    [-5.5, -550],
  ])("%s → %s", (reais, centavos) => {
    expect(paraCentavos(reais)).toBe(centavos);
  });

  it("recusa valor não finito", () => {
    expect(() => paraCentavos(Number.NaN)).toThrow();
    expect(() => paraCentavos(Infinity)).toThrow();
  });
});

describe("centavosParaDecimal", () => {
  it("usa vírgula e duas casas, sem separador de milhar", () => {
    expect(centavosParaDecimal(123456)).toBe("1234,56");
    expect(centavosParaDecimal(5)).toBe("0,05");
    expect(centavosParaDecimal(-150)).toBe("-1,50");
  });
});

describe("formatarReais", () => {
  it("formata em real brasileiro", () => {
    expect(formatarReais(123456)).toBe("R$ 1.234,56");
  });
});
