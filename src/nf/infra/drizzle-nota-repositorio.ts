import { asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  DocumentoComNota,
  MimeAceito,
  NotaRepositorio,
  NovoDocumento,
  ResultadoExtracao,
  ResumoDocumento,
  UsoModelo,
} from "../application/portas";
import type { Nota } from "../domain/nota";
import { documentos, extracoes, itensNota, notas } from "./schema";

type Tx = Parameters<Parameters<PostgresJsDatabase["transaction"]>[0]>[0];

const resumo = {
  id: documentos.id,
  nomeArquivo: documentos.nomeArquivo,
  status: documentos.status,
  criadoEm: documentos.criadoEm,
};

export class DrizzleNotaRepositorio implements NotaRepositorio {
  constructor(private readonly db: PostgresJsDatabase) {}

  async buscarPorSha256(sha256: string): Promise<ResumoDocumento | undefined> {
    const [d] = await this.db.select(resumo).from(documentos).where(eq(documentos.sha256, sha256));
    return d;
  }

  async criarDocumento(doc: NovoDocumento): Promise<string> {
    const [d] = await this.db.insert(documentos).values(doc).returning({ id: documentos.id });
    if (!d) throw new Error("insert de documento não devolveu id");
    return d.id;
  }

  async concluirExtracao(documentoId: string, r: ResultadoExtracao): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(extracoes).values({ documentoId, ...uso(r), saidaBruta: r.saidaBruta });
      await gravarNota(tx, documentoId, r.nota, null);
      await mudarStatus(tx, documentoId, "revisao");
    });
  }

  async registrarFalha(documentoId: string, erro: string, u: UsoModelo | undefined) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(extracoes)
        .values({ documentoId, modelo: u?.modelo ?? "desconhecido", ...(u && uso(u)), erro });
      await mudarStatus(tx, documentoId, "falhou");
    });
  }

  async custoDesde(inicio: Date): Promise<number> {
    const [r] = await this.db
      .select({ total: sql<string>`coalesce(sum(${extracoes.custoUsd}), 0)` })
      .from(extracoes)
      .where(gte(extracoes.criadoEm, inicio));
    return Number(r?.total ?? 0);
  }

  async buscar(id: string): Promise<DocumentoComNota | undefined> {
    const [d] = await this.db
      .select({ ...resumo, mime: documentos.mime })
      .from(documentos)
      .where(eq(documentos.id, id));
    if (!d) return undefined;
    const [ultima] = await this.db
      .select({ erro: extracoes.erro })
      .from(extracoes)
      .where(eq(extracoes.documentoId, id))
      .orderBy(desc(extracoes.criadoEm))
      .limit(1);
    const nota = await this.lerNota(id);
    return { ...d, mime: d.mime as MimeAceito, nota, erro: ultima?.erro ?? null };
  }

  async listar(limite: number): Promise<ResumoDocumento[]> {
    return this.db.select(resumo).from(documentos).orderBy(desc(documentos.criadoEm)).limit(limite);
  }

  async salvarRevisao(id: string, nota: Nota, status: "revisao" | "aprovada"): Promise<void> {
    await this.db.transaction(async (tx) => {
      await gravarNota(tx, id, nota, new Date());
      await mudarStatus(tx, id, status);
    });
  }

  async listarAprovadas(): Promise<{ arquivo: string; nota: Nota }[]> {
    const docs = await this.db
      .select({ id: documentos.id, arquivo: documentos.nomeArquivo })
      .from(documentos)
      .where(eq(documentos.status, "aprovada"))
      .orderBy(asc(documentos.criadoEm));
    const saida = [];
    for (const d of docs) {
      const nota = await this.lerNota(d.id);
      if (nota) saida.push({ arquivo: d.arquivo, nota });
    }
    return saida;
  }

  async apagarAnterioresA(data: Date): Promise<number> {
    const apagados = await this.db
      .delete(documentos)
      .where(lt(documentos.criadoEm, data))
      .returning({ id: documentos.id });
    return apagados.length;
  }

  private async lerNota(documentoId: string): Promise<Nota | null> {
    const [n] = await this.db.select().from(notas).where(eq(notas.documentoId, documentoId));
    if (!n) return null;
    const itens = await this.db
      .select()
      .from(itensNota)
      .where(eq(itensNota.documentoId, documentoId))
      .orderBy(asc(itensNota.ordem));
    return {
      cnpjEmitente: n.cnpjEmitente,
      dataEmissao: n.dataEmissao,
      valorTotal: n.valorTotalCentavos,
      desconto: n.descontoCentavos,
      frete: n.freteCentavos,
      itens: itens.map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
        valorTotal: i.valorTotalCentavos,
      })),
    };
  }
}

function uso(u: UsoModelo) {
  return {
    modelo: u.modelo,
    tokensEntrada: u.tokensEntrada,
    tokensSaida: u.tokensSaida,
    custoUsd: u.custoUsd,
    latenciaMs: u.latenciaMs,
  };
}

async function mudarStatus(tx: Tx, id: string, status: ResumoDocumento["status"]) {
  await tx
    .update(documentos)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(documentos.id, id));
}

async function gravarNota(tx: Tx, documentoId: string, nota: Nota, revisadoEm: Date | null) {
  const valores = {
    cnpjEmitente: nota.cnpjEmitente,
    dataEmissao: nota.dataEmissao,
    valorTotalCentavos: nota.valorTotal,
    descontoCentavos: nota.desconto,
    freteCentavos: nota.frete,
    revisadoEm,
  };
  await tx
    .insert(notas)
    .values({ documentoId, ...valores })
    .onConflictDoUpdate({ target: notas.documentoId, set: valores });
  await tx.delete(itensNota).where(eq(itensNota.documentoId, documentoId));
  if (nota.itens.length > 0) {
    await tx.insert(itensNota).values(
      nota.itens.map((i, ordem) => ({
        documentoId,
        ordem,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
        valorTotalCentavos: i.valorTotal,
      })),
    );
  }
}
