import { ArquivoInvalido, ErroExtracao, OrcamentoEsgotado } from "./erros";
import type { Arquivo, Extrator, NotaRepositorio } from "./portas";

export const TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024;
const FUSO_BRASILIA_MS = -3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export interface DepsExtrairNota {
  repo: NotaRepositorio;
  extrator: Extrator;
  tetoDiarioUsd: number;
  agora?: () => Date;
}

export interface SaidaExtrairNota {
  documentoId: string;
  reaproveitado: boolean;
}

export function inicioDoDiaEmBrasilia(agora: Date): Date {
  const local = agora.getTime() + FUSO_BRASILIA_MS;
  return new Date(local - (local % DIA_MS) - FUSO_BRASILIA_MS);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Buffer.from(digest).toString("hex");
}

export async function extrairNota(
  deps: DepsExtrairNota,
  arquivo: Arquivo,
): Promise<SaidaExtrairNota> {
  if (arquivo.bytes.length === 0) throw new ArquivoInvalido("O arquivo está vazio.");
  if (arquivo.bytes.length > TAMANHO_MAXIMO_BYTES) {
    throw new ArquivoInvalido("O arquivo passa de 4 MB.");
  }

  const sha256 = await sha256Hex(arquivo.bytes);
  const existente = await deps.repo.buscarPorSha256(sha256);
  if (existente && existente.status !== "falhou") {
    return { documentoId: existente.id, reaproveitado: true };
  }

  const agora = (deps.agora ?? (() => new Date()))();
  const gasto = await deps.repo.custoDesde(inicioDoDiaEmBrasilia(agora));
  if (gasto >= deps.tetoDiarioUsd) throw new OrcamentoEsgotado(gasto, deps.tetoDiarioUsd);

  const documentoId =
    existente?.id ??
    (await deps.repo.criarDocumento({
      nomeArquivo: arquivo.nome,
      mime: arquivo.mime,
      sha256,
      tamanhoBytes: arquivo.bytes.length,
    }));

  try {
    const resultado = await deps.extrator.extrair(arquivo);
    await deps.repo.concluirExtracao(documentoId, resultado);
  } catch (err) {
    if (err instanceof ErroExtracao) {
      await deps.repo.registrarFalha(documentoId, `${err.motivo}: ${err.message}`, err.uso);
    } else {
      await deps.repo.registrarFalha(documentoId, "erro_interno", undefined);
    }
    throw err;
  }
  return { documentoId, reaproveitado: false };
}
