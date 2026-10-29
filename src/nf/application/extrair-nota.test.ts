import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Nota } from "../domain/nota";
import { ArquivoInvalido, ErroExtracao, OrcamentoEsgotado } from "./erros";
import { extrairNota, inicioDoDiaEmBrasilia, sha256Hex } from "./extrair-nota";
import type { Arquivo, Extrator, ResultadoExtracao } from "./portas";
import { RepositorioEmMemoria } from "./testes/repositorio-em-memoria";

const nota: Nota = {
  cnpjEmitente: "11222333000181",
  dataEmissao: "2026-10-20",
  valorTotal: 1500,
  desconto: 0,
  frete: 0,
  itens: [{ descricao: "Caneta", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 }],
};

const resultado: ResultadoExtracao = {
  nota,
  saidaBruta: {},
  modelo: "claude-opus-5-5",
  tokensEntrada: 3000,
  tokensSaida: 700,
  custoUsd: 0.3,
  latenciaMs: 5000,
};

const arquivo = (conteudo = "nota fiscal"): Arquivo => ({
  nome: "nota.pdf",
  mime: "application/pdf",
  bytes: new TextEncoder().encode(conteudo),
});

let repo: RepositorioEmMemoria;
let extrator: Extrator & { extrair: ReturnType<typeof vi.fn> };
const deps = () => ({ repo, extrator, tetoDiarioUsd: 1 });

beforeEach(() => {
  repo = new RepositorioEmMemoria();
  extrator = { extrair: vi.fn().mockResolvedValue(resultado) };
});

describe("extrairNota", () => {
  it("extrai, grava e deixa a nota em revisão", async () => {
    const r = await extrairNota(deps(), arquivo());
    expect(r.reaproveitado).toBe(false);
    const doc = await repo.buscar(r.documentoId);
    expect(doc).toMatchObject({ status: "revisao", nota, nomeArquivo: "nota.pdf" });
  });

  it("reaproveita arquivo repetido sem chamar o modelo de novo", async () => {
    const primeiro = await extrairNota(deps(), arquivo());
    const segundo = await extrairNota(deps(), arquivo());
    expect(segundo).toEqual({ documentoId: primeiro.documentoId, reaproveitado: true });
    expect(extrator.extrair).toHaveBeenCalledTimes(1);
  });

  it("tenta de novo um arquivo cuja extração falhou, no mesmo documento", async () => {
    extrator.extrair.mockRejectedValueOnce(new ErroExtracao("indisponivel", "API fora"));
    await expect(extrairNota(deps(), arquivo())).rejects.toThrow(ErroExtracao);
    const [falho] = await repo.listar(1);

    const r = await extrairNota(deps(), arquivo());
    expect(r.documentoId).toBe(falho?.id);
    expect((await repo.buscar(r.documentoId))?.status).toBe("revisao");
  });

  it("registra a falha com motivo e custo e repassa o erro", async () => {
    const uso = { ...resultado, custoUsd: 0.05 };
    extrator.extrair.mockRejectedValue(new ErroExtracao("recusa", "o modelo recusou", uso));
    await expect(extrairNota(deps(), arquivo())).rejects.toMatchObject({ motivo: "recusa" });
    const [doc] = await repo.listar(1);
    expect(await repo.buscar(doc!.id)).toMatchObject({
      status: "falhou",
      erro: "recusa: o modelo recusou",
    });
    expect(await repo.custoDesde(new Date(0))).toBeCloseTo(0.05);
  });

  it("marca erro inesperado como erro interno", async () => {
    extrator.extrair.mockRejectedValue(new TypeError("bug"));
    await expect(extrairNota(deps(), arquivo())).rejects.toThrow(TypeError);
    const [doc] = await repo.listar(1);
    expect((await repo.buscar(doc!.id))?.erro).toBe("erro_interno");
  });

  it("bloqueia quando o teto diário foi atingido", async () => {
    extrator.extrair.mockResolvedValue({ ...resultado, custoUsd: 0.5 });
    await extrairNota(deps(), arquivo("a"));
    await extrairNota(deps(), arquivo("b"));
    extrator.extrair.mockClear();
    await expect(extrairNota(deps(), arquivo("c"))).rejects.toThrow(OrcamentoEsgotado);
    expect(extrator.extrair).not.toHaveBeenCalled();
  });

  it("recusa arquivo vazio ou maior que 4 MB", async () => {
    await expect(extrairNota(deps(), arquivo(""))).rejects.toThrow(ArquivoInvalido);
    const grande = { ...arquivo(), bytes: new Uint8Array(4 * 1024 * 1024 + 1) };
    await expect(extrairNota(deps(), grande)).rejects.toThrow(ArquivoInvalido);
  });
});

describe("inicioDoDiaEmBrasilia", () => {
  it("usa meia-noite de Brasília (UTC−3)", () => {
    expect(inicioDoDiaEmBrasilia(new Date("2026-10-27T15:00:00Z")).toISOString()).toBe(
      "2026-10-27T03:00:00.000Z",
    );
    // 01:00 UTC ainda é dia 26 em Brasília
    expect(inicioDoDiaEmBrasilia(new Date("2026-10-27T01:00:00Z")).toISOString()).toBe(
      "2026-10-26T03:00:00.000Z",
    );
  });
});

describe("sha256Hex", () => {
  it("calcula o hash conhecido", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
