import { describe, expect, it } from "vitest";
import {
  centavosParaDecimal,
  formatarDecimalBr,
  formatarReais,
  lerDecimalBr,
  lerReais,
  paraCentavos,
} from "./dinheiro";

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

describe("leitura de valores digitados", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["R$ 10", 10],
    ["0,916", 0.916],
    ["-5,5", -5.5],
    ["abc", null],
    ["", null],
    ["1,2,3", null],
  ])("lerDecimalBr(%j) → %s", (texto, esperado) => {
    expect(lerDecimalBr(texto)).toBe(esperado);
  });

  it("lerReais devolve centavos ou null", () => {
    expect(lerReais("R$ 1.234,56")).toBe(123456);
    expect(lerReais("x")).toBeNull();
  });

  it("formatarDecimalBr usa milhar e casas pedidas", () => {
    expect(formatarDecimalBr(1234.5)).toBe("1.234,50");
    expect(formatarDecimalBr(0.916, 0, 3)).toBe("0,916");
    expect(formatarDecimalBr(2, 0, 3)).toBe("2");
  });
});
