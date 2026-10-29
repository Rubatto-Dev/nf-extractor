import { formatarCnpj } from "./cnpj";
import { centavosParaDecimal } from "./dinheiro";
import type { Nota } from "./nota";

// Formato pensado para abrir direto no Excel em pt-BR: ";" como separador,
// vírgula decimal, data dd/mm/aaaa, BOM UTF-8 e CRLF.
const CABECALHO = [
  "arquivo",
  "cnpj_emitente",
  "data_emissao",
  "valor_total",
  "desconto",
  "frete",
  "item",
  "descricao",
  "quantidade",
  "valor_unitario",
  "valor_total_item",
];

export interface NotaExportavel {
  arquivo: string;
  nota: Nota;
}

function campo(valor: string): string {
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

function decimal(n: number): string {
  return String(Number(n.toFixed(4))).replace(".", ",");
}

function dataBr(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function gerarCsv(notas: NotaExportavel[]): string {
  const linhas = [CABECALHO.join(";")];
  for (const { arquivo, nota } of notas) {
    const cabecalhoNota = [
      arquivo,
      formatarCnpj(nota.cnpjEmitente),
      dataBr(nota.dataEmissao),
      centavosParaDecimal(nota.valorTotal),
      centavosParaDecimal(nota.desconto),
      centavosParaDecimal(nota.frete),
    ];
    nota.itens.forEach((item, i) => {
      const linha = [
        ...cabecalhoNota,
        String(i + 1),
        item.descricao,
        decimal(item.quantidade),
        decimal(item.valorUnitario),
        centavosParaDecimal(item.valorTotal),
      ];
      linhas.push(linha.map(campo).join(";"));
    });
  }
  return `﻿${linhas.join("\r\n")}\r\n`;
}
