import { gerarCsv } from "../domain/csv";
import type { Nota, Sinalizacao } from "../domain/nota";
import { validarNota } from "../domain/validacao";
import { NotaComSinalizacoes, NotaNaoEncontrada } from "./erros";
import { inicioDoDiaEmBrasilia } from "./extrair-nota";
import type { DocumentoComNota, NotaRepositorio, StatusDocumento } from "./portas";

export type Situacao = StatusDocumento | "divergente";

export interface LinhaPainel extends DocumentoComNota {
  situacao: Situacao;
  sinalizacoes: Sinalizacao[];
}

export interface Painel {
  linhas: LinhaPainel[];
  contagem: { revisao: number; divergente: number; aprovada: number };
  gastoHojeUsd: number;
}

function situacao(doc: DocumentoComNota, sinalizacoes: Sinalizacao[]): Situacao {
  if (doc.status === "revisao" && sinalizacoes.length > 0) return "divergente";
  return doc.status;
}

export async function montarPainel(
  repo: NotaRepositorio,
  agora: Date,
  hoje: string,
  limite = 50,
): Promise<Painel> {
  const resumos = await repo.listar(limite);
  const docs = await Promise.all(resumos.map((r) => repo.buscar(r.id)));
  const linhas = docs
    .filter((d): d is DocumentoComNota => d !== undefined)
    .map((d) => {
      const sinalizacoes = d.nota ? validarNota(d.nota, hoje) : [];
      return { ...d, sinalizacoes, situacao: situacao(d, sinalizacoes) };
    });
  const conta = (s: Situacao) => linhas.filter((l) => l.situacao === s).length;
  return {
    linhas,
    contagem: {
      revisao: conta("revisao") + conta("divergente"),
      divergente: conta("divergente"),
      aprovada: conta("aprovada"),
    },
    gastoHojeUsd: await repo.custoDesde(inicioDoDiaEmBrasilia(agora)),
  };
}

export async function buscarParaRevisao(repo: NotaRepositorio, id: string) {
  const doc = await repo.buscar(id);
  if (!doc) throw new NotaNaoEncontrada(id);
  return doc;
}

export async function revisarNota(
  repo: NotaRepositorio,
  id: string,
  nota: Nota,
  aprovar: boolean,
  hoje: string,
): Promise<Sinalizacao[]> {
  await buscarParaRevisao(repo, id);
  const sinalizacoes = validarNota(nota, hoje);
  if (aprovar && sinalizacoes.length > 0) throw new NotaComSinalizacoes(sinalizacoes.length);
  await repo.salvarRevisao(id, nota, aprovar ? "aprovada" : "revisao");
  return sinalizacoes;
}

export async function exportarCsv(repo: NotaRepositorio): Promise<string> {
  return gerarCsv(await repo.listarAprovadas());
}
