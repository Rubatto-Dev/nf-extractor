import { describe, expect, it } from "vitest";
import type { Nota } from "../src/nf/domain/nota";
import { calcularRelatorio, camposCorretos, type Execucao } from "./metricas";

const HOJE = "2026-10-01";

const esperado: Nota = {
  cnpjEmitente: "11222333000181",
  dataEmissao: "2026-09-10",
  valorTotal: 3500,
  desconto: 0,
  frete: 0,
  itens: [
    { descricao: "A", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 },
    { descricao: "B", quantidade: 2, valorUnitario: 10, valorTotal: 2000 },
  ],
};

const exec = (obtido: Nota | null, latenciaMs = 1000, custoUsd = 0.03): Execucao => ({
  id: "x",
  esperado,
  obtido,
  custoUsd,
  latenciaMs,
});

describe("camposCorretos", () => {
  it("compara CNPJ normalizado e itens sem depender da ordem nem da descrição", () => {
    const obtido: Nota = {
      ...esperado,
      cnpjEmitente: "11.222.333/0001-81",
      itens: [
        { descricao: "b escrito diferente", quantidade: 2, valorUnitario: 10, valorTotal: 2000 },
        { descricao: "A", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 },
      ],
    };
    expect(Object.values(camposCorretos(esperado, obtido)).every(Boolean)).toBe(true);
  });

  it("marca o campo errado e itens faltando", () => {
    const c = camposCorretos(esperado, {
      ...esperado,
      dataEmissao: "2026-10-09",
      itens: esperado.itens.slice(1),
    });
    expect(c).toMatchObject({ cnpj: true, data: false, total: true, itens: false });
  });

  it("falha de extração erra todos os campos", () => {
    expect(Object.values(camposCorretos(esperado, null)).some(Boolean)).toBe(false);
  });
});

describe("calcularRelatorio", () => {
  it("calcula acerto por campo, sinalização do domínio, custo e latência", () => {
    const totalErrado = { ...esperado, valorTotal: 3600 }; // o domínio pega: soma divergente
    const dataErrada = { ...esperado, dataEmissao: "2026-09-11" }; // o domínio não tem como pegar
    const r = calcularRelatorio(
      [
        exec(esperado, 1000),
        exec(esperado, 3000),
        exec(totalErrado, 2000),
        exec(dataErrada, 4000),
        exec(null, 0, 0),
      ],
      HOJE,
    );

    expect(r).toMatchObject({
      documentos: 5,
      falhas: 1,
      notasPerfeitas: 40,
      errosSinalizados: { pegos: 2, deNotasComErro: 3 },
      falsosAlarmes: 0,
      latenciaMs: { p50: 2000, p95: 4000 },
    });
    expect(r.acertoPorCampo).toMatchObject({ cnpj: 80, data: 60, total: 60, itens: 80 });
    expect(r.custoTotalUsd).toBeCloseTo(0.12);
    expect(r.custoMedioUsd).toBeCloseTo(0.024);
  });

  it("conta falso alarme em nota certa sinalizada", () => {
    const certaMasEstranha = { ...esperado, cnpjEmitente: "11222333000182" };
    const r = calcularRelatorio([{ ...exec(certaMasEstranha), esperado: certaMasEstranha }], HOJE);
    expect(r.falsosAlarmes).toBe(1);
  });

  it("relatório vazio não divide por zero", () => {
    expect(calcularRelatorio([], HOJE)).toMatchObject({ custoMedioUsd: 0, notasPerfeitas: 0 });
  });
});
