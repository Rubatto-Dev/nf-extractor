import { describe, expect, it } from "vitest";
import type { Nota } from "./nota";
import { notaAprovavel, validarNota } from "./validacao";

const HOJE = "2026-10-27";

function nota(parcial: Partial<Nota> = {}): Nota {
  return {
    cnpjEmitente: "11.222.333/0001-81",
    dataEmissao: "2026-10-20",
    valorTotal: 3500,
    desconto: 0,
    frete: 0,
    itens: [
      { descricao: "Caneta azul", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 },
      { descricao: "Caderno", quantidade: 2, valorUnitario: 10, valorTotal: 2000 },
    ],
    ...parcial,
  };
}

const codigos = (n: Nota) => validarNota(n, HOJE).map((s) => s.codigo);

describe("validarNota", () => {
  it("nota consistente não tem sinalização", () => {
    expect(validarNota(nota(), HOJE)).toEqual([]);
  });

  it("sinaliza CNPJ com dígito verificador errado", () => {
    expect(codigos(nota({ cnpjEmitente: "11.222.333/0001-82" }))).toEqual(["cnpj_invalido"]);
  });

  it("sinaliza soma dos itens diferente do total, com a diferença", () => {
    const [s] = validarNota(nota({ valorTotal: 3600 }), HOJE);
    expect(s?.codigo).toBe("soma_divergente");
    expect(s?.mensagem).toContain("R$ 1,00");
  });

  it("considera desconto e frete na soma", () => {
    expect(codigos(nota({ desconto: 500, frete: 1200, valorTotal: 4200 }))).toEqual([]);
    expect(codigos(nota({ desconto: 500, valorTotal: 3500 }))).toEqual(["soma_divergente"]);
  });

  it("sinaliza nota sem itens", () => {
    expect(codigos(nota({ itens: [], valorTotal: 0 }))).toEqual(["sem_itens", "total_invalido"]);
  });

  it("sinaliza total zero ou negativo", () => {
    expect(codigos(nota({ itens: [], valorTotal: -1 }))).toContain("total_invalido");
  });

  it.each([
    ["2026-10-28", "data_futura"],
    ["2021-10-26", "data_antiga"],
    ["2026-02-30", "data_invalida"],
    ["20/10/2026", "data_invalida"],
  ])("data %s → %s", (data, codigo) => {
    expect(codigos(nota({ dataEmissao: data }))).toEqual([codigo]);
  });

  it("aceita data de hoje e de exatamente 5 anos atrás", () => {
    expect(codigos(nota({ dataEmissao: HOJE }))).toEqual([]);
    expect(codigos(nota({ dataEmissao: "2021-10-27" }))).toEqual([]);
  });

  it("sinaliza item com quantidade × unitário diferente do total do item", () => {
    const n = nota({
      itens: [
        { descricao: "Caneta azul", quantidade: 10, valorUnitario: 1.5, valorTotal: 1600 },
        { descricao: "Caderno", quantidade: 2, valorUnitario: 10, valorTotal: 2000 },
      ],
      valorTotal: 3600,
    });
    const s = validarNota(n, HOJE);
    expect(s).toEqual([expect.objectContaining({ codigo: "item_inconsistente", item: 0 })]);
  });

  it("tolera 1 centavo de arredondamento no item", () => {
    const n = nota({
      itens: [{ descricao: "Parafuso", quantidade: 3, valorUnitario: 0.3333, valorTotal: 100 }],
      valorTotal: 100,
    });
    expect(validarNota(n, HOJE)).toEqual([]);
  });
});

describe("notaAprovavel", () => {
  it("só aprova sem sinalização", () => {
    expect(notaAprovavel(nota(), HOJE)).toBe(true);
    expect(notaAprovavel(nota({ valorTotal: 1 }), HOJE)).toBe(false);
  });
});
