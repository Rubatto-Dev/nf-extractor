import { describe, expect, it } from "vitest";
import { cnpjValido, formatarCnpj, gerarCnpj, normalizarCnpj } from "./cnpj";

describe("normalizarCnpj", () => {
  it("remove pontuação e deixa maiúsculo", () => {
    expect(normalizarCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });
});

describe("cnpjValido", () => {
  it.each([
    "11.222.333/0001-81",
    "11222333000181",
    "45.997.418/0001-53",
    // exemplo oficial do CNPJ alfanumérico (Receita Federal)
    "12.ABC.345/01DE-35",
    "12abc34501de35",
  ])("aceita %s", (cnpj) => {
    expect(cnpjValido(cnpj)).toBe(true);
  });

  it.each([
    ["dígito verificador errado", "11.222.333/0001-82"],
    ["DV alfanumérico errado", "12.ABC.345/01DE-36"],
    ["todos iguais", "00.000.000/0000-00"],
    ["curto", "1122233300018"],
    ["longo", "112223330001811"],
    ["letra no DV", "12ABC34501DEA5"],
    ["caractere inválido", "12ABC3450*DE35"],
    ["vazio", ""],
  ])("rejeita %s", (_, cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false);
  });
});

describe("formatarCnpj", () => {
  it("aplica a máscara", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("devolve o original quando não tem 14 caracteres", () => {
    expect(formatarCnpj("123")).toBe("123");
  });
});

describe("gerarCnpj", () => {
  it("gera CNPJ válido a partir da raiz de 12 caracteres", () => {
    expect(gerarCnpj("112223330001")).toBe("11222333000181");
    expect(gerarCnpj("12ABC34501DE")).toBe("12ABC34501DE35");
  });

  it("recusa raiz de tamanho errado", () => {
    expect(() => gerarCnpj("123")).toThrow();
  });
});
