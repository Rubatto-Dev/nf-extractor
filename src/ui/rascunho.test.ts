import { describe, expect, it } from "vitest";
import type { Nota } from "@/nf/domain/nota";
import { notaParaRascunho, rascunhoParaNota } from "./rascunho";

const nota: Nota = {
  cnpjEmitente: "12ABC34501DE35",
  dataEmissao: "2026-10-20",
  valorTotal: 123456,
  desconto: 500,
  frete: 0,
  itens: [{ descricao: "Queijo", quantidade: 2.086, valorUnitario: 44.07, valorTotal: 9193 }],
};

describe("rascunho", () => {
  it("formata a nota em pt-BR para edição", () => {
    expect(notaParaRascunho(nota)).toEqual({
      cnpj: "12.ABC.345/01DE-35",
      data: "20/10/2026",
      total: "1.234,56",
      desconto: "5,00",
      frete: "0,00",
      itens: [
        { descricao: "Queijo", quantidade: "2,086", valorUnitario: "44,07", valorTotal: "91,93" },
      ],
    });
  });

  it("volta para a mesma nota (ida e volta)", () => {
    expect(rascunhoParaNota(notaParaRascunho(nota))).toEqual({ nota, formato: [] });
  });

  it("aponta campo que não é número e item sem descrição", () => {
    const r = notaParaRascunho(nota);
    const { nota: n, formato } = rascunhoParaNota({
      ...r,
      total: "doze",
      itens: [{ ...r.itens[0]!, descricao: " ", quantidade: "x" }],
    });
    expect(n).toBeNull();
    expect(formato).toEqual([
      'Valor total: "doze" não é um valor.',
      "Item 1: falta a descrição.",
      'Item 1, quantidade: "x" não é um número.',
    ]);
  });

  it("mantém data fora do formato para o domínio sinalizar", () => {
    const { nota: n } = rascunhoParaNota({ ...notaParaRascunho(nota), data: "20-10-2026" });
    expect(n?.dataEmissao).toBe("20-10-2026");
  });
});
