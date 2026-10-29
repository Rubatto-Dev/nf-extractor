import type { Nota } from "../domain/nota";

export const MIMES_ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type MimeAceito = (typeof MIMES_ACEITOS)[number];

export interface Arquivo {
  nome: string;
  mime: MimeAceito;
  bytes: Uint8Array;
}

export interface UsoModelo {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoUsd: number;
  latenciaMs: number;
}

export interface ResultadoExtracao extends UsoModelo {
  nota: Nota;
  saidaBruta: unknown;
}

export interface Extrator {
  extrair(arquivo: Arquivo): Promise<ResultadoExtracao>;
}

export type StatusDocumento = "extraindo" | "revisao" | "aprovada" | "falhou";

export interface ResumoDocumento {
  id: string;
  nomeArquivo: string;
  status: StatusDocumento;
  criadoEm: Date;
}

export interface DocumentoComNota extends ResumoDocumento {
  mime: MimeAceito;
  nota: Nota | null;
  erro: string | null;
  /** modelo da última extração; null antes da primeira */
  modelo: string | null;
}

export interface NovoDocumento {
  nomeArquivo: string;
  mime: MimeAceito;
  sha256: string;
  tamanhoBytes: number;
}

export interface NotaRepositorio {
  buscarPorSha256(sha256: string): Promise<ResumoDocumento | undefined>;
  criarDocumento(doc: NovoDocumento): Promise<string>;
  concluirExtracao(documentoId: string, r: ResultadoExtracao): Promise<void>;
  registrarFalha(documentoId: string, erro: string, uso: UsoModelo | undefined): Promise<void>;
  custoDesde(inicio: Date): Promise<number>;
  buscar(id: string): Promise<DocumentoComNota | undefined>;
  listar(limite: number): Promise<ResumoDocumento[]>;
  salvarRevisao(id: string, nota: Nota, status: "revisao" | "aprovada"): Promise<void>;
  listarAprovadas(): Promise<{ arquivo: string; nota: Nota }[]>;
  apagarAnterioresA(data: Date): Promise<number>;
}
