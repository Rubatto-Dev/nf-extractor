import { randomUUID } from "node:crypto";
import type { Nota } from "../../domain/nota";
import type {
  DocumentoComNota,
  NotaRepositorio,
  NovoDocumento,
  ResultadoExtracao,
  ResumoDocumento,
  StatusDocumento,
  UsoModelo,
} from "../portas";

interface Registro extends NovoDocumento {
  id: string;
  status: StatusDocumento;
  criadoEm: Date;
  nota: Nota | null;
  erro: string | null;
}

export class RepositorioEmMemoria implements NotaRepositorio {
  readonly docs = new Map<string, Registro>();
  readonly custos: { valor: number; em: Date }[] = [];

  constructor(private readonly agora: () => Date = () => new Date()) {}

  async buscarPorSha256(sha256: string) {
    const d = [...this.docs.values()].find((x) => x.sha256 === sha256);
    return d && this.resumo(d);
  }

  async criarDocumento(doc: NovoDocumento) {
    const id = randomUUID();
    this.docs.set(id, {
      ...doc,
      id,
      status: "extraindo",
      criadoEm: this.agora(),
      nota: null,
      erro: null,
    });
    return id;
  }

  async concluirExtracao(id: string, r: ResultadoExtracao) {
    const d = this.pegar(id);
    this.custos.push({ valor: r.custoUsd, em: this.agora() });
    Object.assign(d, { nota: r.nota, status: "revisao", erro: null });
  }

  async registrarFalha(id: string, erro: string, uso: UsoModelo | undefined) {
    const d = this.pegar(id);
    if (uso) this.custos.push({ valor: uso.custoUsd, em: this.agora() });
    Object.assign(d, { status: "falhou", erro });
  }

  async custoDesde(inicio: Date) {
    return this.custos.filter((c) => c.em >= inicio).reduce((a, c) => a + c.valor, 0);
  }

  async buscar(id: string): Promise<DocumentoComNota | undefined> {
    const d = this.docs.get(id);
    return d && { ...this.resumo(d), mime: d.mime, nota: d.nota, erro: d.erro };
  }

  async listar(limite: number) {
    return [...this.docs.values()]
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .slice(0, limite)
      .map((d) => this.resumo(d));
  }

  async salvarRevisao(id: string, nota: Nota, status: "revisao" | "aprovada") {
    Object.assign(this.pegar(id), { nota, status });
  }

  async listarAprovadas() {
    return [...this.docs.values()]
      .filter((d) => d.status === "aprovada" && d.nota)
      .map((d) => ({ arquivo: d.nomeArquivo, nota: d.nota as Nota }));
  }

  async apagarAnterioresA(data: Date) {
    let n = 0;
    for (const [id, d] of this.docs) {
      if (d.criadoEm < data) {
        this.docs.delete(id);
        n++;
      }
    }
    return n;
  }

  private pegar(id: string) {
    const d = this.docs.get(id);
    if (!d) throw new Error(`documento ${id} não existe`);
    return d;
  }

  private resumo(d: Registro): ResumoDocumento {
    return { id: d.id, nomeArquivo: d.nomeArquivo, status: d.status, criadoEm: d.criadoEm };
  }
}
