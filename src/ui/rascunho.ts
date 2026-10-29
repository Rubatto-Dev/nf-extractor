import { formatarCnpj, normalizarCnpj } from "@/nf/domain/cnpj";
import { brParaIso, isoParaBr } from "@/nf/domain/datas";
import { formatarDecimalBr, lerDecimalBr, lerReais } from "@/nf/domain/dinheiro";
import type { Nota } from "@/nf/domain/nota";

// O que a pessoa digita na tela de revisão, campo a campo, em pt-BR.
export interface ItemRascunho {
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
}

export interface Rascunho {
  cnpj: string;
  data: string;
  total: string;
  desconto: string;
  frete: string;
  itens: ItemRascunho[];
}

export const ITEM_VAZIO: ItemRascunho = {
  descricao: "",
  quantidade: "1",
  valorUnitario: "0,00",
  valorTotal: "0,00",
};

const reais = (c: number) => formatarDecimalBr(c / 100);

export function notaParaRascunho(n: Nota): Rascunho {
  return {
    cnpj: formatarCnpj(n.cnpjEmitente),
    data: isoParaBr(n.dataEmissao),
    total: reais(n.valorTotal),
    desconto: reais(n.desconto),
    frete: reais(n.frete),
    itens: n.itens.map((i) => ({
      descricao: i.descricao,
      quantidade: formatarDecimalBr(i.quantidade, 0, 4),
      valorUnitario: formatarDecimalBr(i.valorUnitario, 2, 4),
      valorTotal: reais(i.valorTotal),
    })),
  };
}

/** Converte o rascunho em nota; campos que não são número viram mensagens de formato. */
export function rascunhoParaNota(r: Rascunho): { nota: Nota | null; formato: string[] } {
  const formato: string[] = [];
  const valor = (texto: string, rotulo: string) => {
    const v = lerReais(texto);
    if (v === null) formato.push(`${rotulo}: "${texto}" não é um valor.`);
    return v ?? 0;
  };
  const numero = (texto: string, rotulo: string) => {
    const v = lerDecimalBr(texto);
    if (v === null) formato.push(`${rotulo}: "${texto}" não é um número.`);
    return v ?? 0;
  };

  const nota: Nota = {
    cnpjEmitente: normalizarCnpj(r.cnpj),
    dataEmissao: brParaIso(r.data),
    valorTotal: valor(r.total, "Valor total"),
    desconto: valor(r.desconto, "Desconto"),
    frete: valor(r.frete, "Frete"),
    itens: r.itens.map((i, k) => {
      if (!i.descricao.trim()) formato.push(`Item ${k + 1}: falta a descrição.`);
      return {
        descricao: i.descricao.trim(),
        quantidade: numero(i.quantidade, `Item ${k + 1}, quantidade`),
        valorUnitario: numero(i.valorUnitario, `Item ${k + 1}, unitário`),
        valorTotal: valor(i.valorTotal, `Item ${k + 1}, total`),
      };
    }),
  };
  return { nota: formato.length === 0 ? nota : null, formato };
}
