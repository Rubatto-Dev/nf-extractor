export type Centavos = number;

export function paraCentavos(reais: number): Centavos {
  if (!Number.isFinite(reais)) throw new Error(`valor monetário inválido: ${reais}`);
  // toFixed sobre o valor arredondado em 4 casas evita 1.005 → 100 por erro de float
  return Math.round(Number((reais * 100).toFixed(4)));
}

export function centavosParaDecimal(c: Centavos): string {
  const sinal = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sinal}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(c: Centavos): string {
  return brl.format(c / 100).replace(/ /g, " ");
}

/** Número digitado em pt-BR ("1.234,56", "R$ 10", "0,916") → número; null se não for número. */
export function lerDecimalBr(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!/^-?[\d.]*,?\d*$/.test(limpo) || !/\d/.test(limpo)) return null;
  return Number(limpo.replace(/\./g, "").replace(",", "."));
}

export function lerReais(texto: string): Centavos | null {
  const n = lerDecimalBr(texto);
  return n === null ? null : paraCentavos(n);
}

/** Número → texto pt-BR com separador de milhar, entre `min` e `max` casas decimais. */
export function formatarDecimalBr(n: number, min = 2, max = min): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });
}
