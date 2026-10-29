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
