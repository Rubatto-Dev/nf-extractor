import { beforeEach, describe, expect, it } from "vitest";
import type { Nota } from "../domain/nota";
import { NotaComSinalizacoes, NotaNaoEncontrada } from "./erros";
import {
  apagarExpiradas,
  buscarParaRevisao,
  exportarCsv,
  montarPainel,
  revisarNota,
} from "./notas";
import type { ResultadoExtracao } from "./portas";
import { RepositorioEmMemoria } from "./testes/repositorio-em-memoria";

const HOJE = "2026-10-28";
const AGORA = new Date("2026-10-28T15:00:00Z");

const ok: Nota = {
  cnpjEmitente: "11222333000181",
  dataEmissao: "2026-10-20",
  valorTotal: 1500,
  desconto: 0,
  frete: 0,
  itens: [{ descricao: "Caneta", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 }],
};
const divergente: Nota = { ...ok, valorTotal: 1600 };

const extracao = (nota: Nota, custoUsd = 0.03): ResultadoExtracao => ({
  nota,
  saidaBruta: {},
  modelo: "claude-opus-5-5",
  tokensEntrada: 1,
  tokensSaida: 1,
  custoUsd,
  latenciaMs: 1,
});

let repo: RepositorioEmMemoria;
let seq = 0;
async function novo(nota: Nota | null, nome = `n${++seq}.pdf`) {
  const id = await repo.criarDocumento({
    nomeArquivo: nome,
    mime: "application/pdf",
    sha256: String(seq),
    tamanhoBytes: 1,
  });
  if (nota) await repo.concluirExtracao(id, extracao(nota));
  return id;
}

beforeEach(() => {
  repo = new RepositorioEmMemoria(() => AGORA);
});

describe("montarPainel", () => {
  it("separa divergentes, conta por situação e soma o gasto do dia", async () => {
    await novo(ok);
    await novo(divergente);
    const aprovada = await novo(ok);
    await repo.salvarRevisao(aprovada, ok, "aprovada");
    const falha = await novo(null);
    await repo.registrarFalha(falha, "nao_e_nota: x", undefined);

    const p = await montarPainel(repo, AGORA, HOJE);
    expect(p.contagem).toEqual({ revisao: 2, divergente: 1, aprovada: 1 });
    expect(p.linhas.map((l) => l.situacao).sort()).toEqual([
      "aprovada",
      "divergente",
      "falhou",
      "revisao",
    ]);
    expect(p.gastoHojeUsd).toBeCloseTo(0.09);
  });
});

describe("revisarNota", () => {
  it("salva correção e devolve as sinalizações restantes", async () => {
    const id = await novo(divergente);
    const s = await revisarNota(repo, id, divergente, false, HOJE);
    expect(s.map((x) => x.codigo)).toEqual(["soma_divergente"]);
    expect((await repo.buscar(id))?.status).toBe("revisao");
  });

  it("aprova nota sem sinalização", async () => {
    const id = await novo(divergente);
    await revisarNota(repo, id, ok, true, HOJE);
    expect(await repo.buscar(id)).toMatchObject({ status: "aprovada", nota: ok });
  });

  it("não aprova nota com sinalização", async () => {
    const id = await novo(divergente);
    await expect(revisarNota(repo, id, divergente, true, HOJE)).rejects.toThrow(
      NotaComSinalizacoes,
    );
    expect((await repo.buscar(id))?.status).toBe("revisao");
  });

  it("falha com nota inexistente", async () => {
    await expect(revisarNota(repo, "x", ok, false, HOJE)).rejects.toThrow(NotaNaoEncontrada);
    await expect(buscarParaRevisao(repo, "x")).rejects.toThrow(NotaNaoEncontrada);
  });
});

describe("exportarCsv", () => {
  it("exporta só as aprovadas", async () => {
    const id = await novo(ok, "aprovada.pdf");
    await revisarNota(repo, id, ok, true, HOJE);
    await novo(ok, "pendente.pdf");
    const csv = await exportarCsv(repo);
    expect(csv).toContain("aprovada.pdf");
    expect(csv).not.toContain("pendente.pdf");
  });
});

describe("apagarExpiradas", () => {
  it("apaga só o que passou do prazo", async () => {
    let relogio = new Date("2026-10-27T10:00:00Z");
    repo = new RepositorioEmMemoria(() => relogio);
    const velha = await novo(ok);
    relogio = new Date("2026-10-28T09:00:00Z");
    const nova = await novo(ok);

    const apagadas = await apagarExpiradas(repo, new Date("2026-10-28T11:00:00Z"), 24);
    expect(apagadas).toBe(1);
    expect(await repo.buscar(velha)).toBeUndefined();
    expect(await repo.buscar(nova)).toBeDefined();
  });
});
