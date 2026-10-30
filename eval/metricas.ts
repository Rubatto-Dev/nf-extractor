import { normalizarCnpj } from "../src/nf/domain/cnpj";
import type { Nota } from "../src/nf/domain/nota";
import { validarNota } from "../src/nf/domain/validacao";

export const CAMPOS = ["cnpj", "data", "total", "desconto", "frete", "itens"] as const;
export type Campo = (typeof CAMPOS)[number];

export interface Execucao {
  id: string;
  esperado: Nota;
  obtido: Nota | null;
  erro?: string;
  custoUsd: number;
  latenciaMs: number;
}

const chaveItem = (i: Nota["itens"][number]) => `${i.quantidade.toFixed(3)}|${i.valorTotal}`;

function itensIguais(a: Nota["itens"], b: Nota["itens"]): boolean {
  if (a.length !== b.length) return false;
  const restantes = b.map(chaveItem);
  return a.every((i) => {
    const k = restantes.indexOf(chaveItem(i));
    if (k < 0) return false;
    restantes.splice(k, 1);
    return true;
  });
}

export function camposCorretos(esperado: Nota, obtido: Nota | null): Record<Campo, boolean> {
  if (!obtido) return Object.fromEntries(CAMPOS.map((c) => [c, false])) as Record<Campo, boolean>;
  return {
    cnpj: normalizarCnpj(obtido.cnpjEmitente) === normalizarCnpj(esperado.cnpjEmitente),
    data: obtido.dataEmissao === esperado.dataEmissao,
    total: obtido.valorTotal === esperado.valorTotal,
    desconto: obtido.desconto === esperado.desconto,
    frete: obtido.frete === esperado.frete,
    itens: itensIguais(esperado.itens, obtido.itens),
  };
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * ordenados.length) - 1;
  return ordenados[Math.max(0, idx)] ?? 0;
}

export interface Relatorio {
  documentos: number;
  falhas: number;
  acertoPorCampo: Record<Campo, number>;
  notasPerfeitas: number;
  /** notas com algum campo errado em que o domínio levantou ao menos uma sinalização */
  errosSinalizados: { pegos: number; deNotasComErro: number };
  /** notas 100% certas que o domínio sinalizou mesmo assim */
  falsosAlarmes: number;
  custoMedioUsd: number;
  custoTotalUsd: number;
  latenciaMs: { p50: number; p95: number };
}

function avaliar(e: Execucao, hoje: string) {
  const campos = camposCorretos(e.esperado, e.obtido);
  return {
    campos,
    perfeita: CAMPOS.every((campo) => campos[campo]),
    // falha de extração conta como sinalizada: a nota vai para "falhou" e não chega ao CSV
    sinalizada: e.obtido ? validarNota(e.obtido, hoje).length > 0 : true,
  };
}

export function calcularRelatorio(execucoes: Execucao[], hoje: string): Relatorio {
  const n = execucoes.length;
  const avaliadas = execucoes.map((e) => avaliar(e, hoje));
  const acertos = Object.fromEntries(
    CAMPOS.map((c) => [c, avaliadas.filter((a) => a.campos[c]).length]),
  ) as Record<Campo, number>;
  const perfeitas = avaliadas.filter((a) => a.perfeita);
  const comErro = avaliadas.filter((a) => !a.perfeita);
  const pegos = comErro.filter((a) => a.sinalizada).length;
  const falsosAlarmes = perfeitas.filter((a) => a.sinalizada).length;

  const custoTotal = execucoes.reduce((a, e) => a + e.custoUsd, 0);
  const latencias = execucoes.filter((e) => e.obtido).map((e) => e.latenciaMs);
  const pct = (v: number) => (n === 0 ? 0 : Math.round((v / n) * 1000) / 10);

  return {
    documentos: n,
    falhas: execucoes.filter((e) => !e.obtido).length,
    acertoPorCampo: Object.fromEntries(CAMPOS.map((c) => [c, pct(acertos[c])])) as Record<
      Campo,
      number
    >,
    notasPerfeitas: pct(perfeitas.length),
    errosSinalizados: { pegos, deNotasComErro: comErro.length },
    falsosAlarmes,
    custoMedioUsd: n === 0 ? 0 : custoTotal / n,
    custoTotalUsd: custoTotal,
    latenciaMs: { p50: percentil(latencias, 50), p95: percentil(latencias, 95) },
  };
}
