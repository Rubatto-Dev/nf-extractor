import { describe, expect, it } from "vitest";
import { gerarCsv } from "./csv";
import type { Nota } from "./nota";

const nota: Nota = {
  cnpjEmitente: "11222333000181",
  dataEmissao: "2026-10-20",
  valorTotal: 4200,
  desconto: 500,
  frete: 1200,
  itens: [
    { descricao: "Caneta; azul", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 },
    {
      descricao: 'Caderno "universitário"',
      quantidade: 2.5,
      valorUnitario: 0.3333,
      valorTotal: 2000,
    },
  ],
};

describe("gerarCsv", () => {
  const csv = gerarCsv([{ arquivo: "nota-1.pdf", nota }]);
  const linhas = csv.replace(/^﻿/, "").split("\r\n");

  it("começa com BOM UTF-8 e usa CRLF", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("tem cabeçalho e uma linha por item", () => {
    expect(linhas[0]).toBe(
      "arquivo;cnpj_emitente;data_emissao;valor_total;desconto;frete;item;descricao;quantidade;valor_unitario;valor_total_item",
    );
    expect(linhas.filter(Boolean)).toHaveLength(3);
  });

  it("formata para o Excel pt-BR e escapa ; e aspas", () => {
    expect(linhas[1]).toBe(
      'nota-1.pdf;11.222.333/0001-81;20/10/2026;42,00;5,00;12,00;1;"Caneta; azul";10;1,5;15,00',
    );
    expect(linhas[2]).toBe(
      'nota-1.pdf;11.222.333/0001-81;20/10/2026;42,00;5,00;12,00;2;"Caderno ""universitário""";2,5;0,3333;20,00',
    );
  });

  it("só cabeçalho quando não há notas", () => {
    expect(gerarCsv([]).split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});
