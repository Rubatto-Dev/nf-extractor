import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ResultadoExtracao } from "../application/portas";
import type { Nota } from "../domain/nota";
import { DrizzleNotaRepositorio } from "./drizzle-nota-repositorio";

let container: StartedPostgreSqlContainer;
let sql: postgres.Sql;
let db: PostgresJsDatabase;
let repo: DrizzleNotaRepositorio;

const nota: Nota = {
  cnpjEmitente: "11222333000181",
  dataEmissao: "2026-10-20",
  valorTotal: 3500,
  desconto: 0,
  frete: 0,
  itens: [
    { descricao: "Caneta", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 },
    { descricao: "Caderno", quantidade: 2, valorUnitario: 10, valorTotal: 2000 },
  ],
};

const resultado: ResultadoExtracao = {
  nota,
  saidaBruta: { ok: true },
  modelo: "claude-opus-5-5",
  tokensEntrada: 3000,
  tokensSaida: 800,
  custoUsd: 0.028,
  latenciaMs: 4200,
};

let seq = 0;
const novoDoc = () =>
  repo.criarDocumento({
    nomeArquivo: `nota-${++seq}.pdf`,
    mime: "application/pdf",
    sha256: String(seq).padStart(64, "0"),
    tamanhoBytes: 1000,
  });

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  sql = postgres(container.getConnectionUri(), { max: 2, onnotice: () => {} });
  db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  repo = new DrizzleNotaRepositorio(db);
}, 120_000);

afterAll(async () => {
  await sql?.end();
  await container?.stop();
});

beforeEach(async () => {
  await sql`truncate documentos cascade`;
});

describe("DrizzleNotaRepositorio", () => {
  it("grava a extração e devolve a nota com itens na ordem", async () => {
    const id = await novoDoc();
    await repo.concluirExtracao(id, resultado);

    const doc = await repo.buscar(id);
    expect(doc).toMatchObject({ status: "revisao", mime: "application/pdf", erro: null });
    expect(doc?.nota).toEqual(nota);
  });

  it("acha documento pelo sha256", async () => {
    const id = await novoDoc();
    const achado = await repo.buscarPorSha256(String(seq).padStart(64, "0"));
    expect(achado?.id).toBe(id);
    expect(await repo.buscarPorSha256("f".repeat(64))).toBeUndefined();
  });

  it("registra falha com o erro e o custo", async () => {
    const id = await novoDoc();
    await repo.registrarFalha(id, "recusa do modelo", { ...resultado, custoUsd: 0.01 });

    const doc = await repo.buscar(id);
    expect(doc).toMatchObject({ status: "falhou", erro: "recusa do modelo", nota: null });
    expect(await repo.custoDesde(new Date(Date.now() - 60_000))).toBeCloseTo(0.01, 6);
  });

  it("soma o custo do período", async () => {
    await repo.concluirExtracao(await novoDoc(), resultado);
    await repo.concluirExtracao(await novoDoc(), resultado);
    expect(await repo.custoDesde(new Date(Date.now() - 60_000))).toBeCloseTo(0.056, 6);
    expect(await repo.custoDesde(new Date(Date.now() + 60_000))).toBe(0);
  });

  it("salva revisão substituindo os itens e aprova", async () => {
    const id = await novoDoc();
    await repo.concluirExtracao(id, resultado);
    const revisada: Nota = {
      ...nota,
      valorTotal: 1500,
      itens: [{ descricao: "Caneta", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 }],
    };
    await repo.salvarRevisao(id, revisada, "aprovada");

    expect((await repo.buscar(id))?.nota).toEqual(revisada);
    expect(await repo.listarAprovadas()).toEqual([{ arquivo: `nota-${seq}.pdf`, nota: revisada }]);
  });

  it("lista do mais novo para o mais antigo, com limite", async () => {
    await novoDoc();
    await novoDoc();
    const ultimo = await novoDoc();
    const lista = await repo.listar(2);
    expect(lista).toHaveLength(2);
    expect(lista[0]?.id).toBe(ultimo);
  });

  it("apaga documentos antigos em cascata", async () => {
    const id = await novoDoc();
    await repo.concluirExtracao(id, resultado);
    expect(await repo.apagarAnterioresA(new Date(Date.now() - 60_000))).toBe(0);
    expect(await repo.apagarAnterioresA(new Date(Date.now() + 60_000))).toBe(1);
    expect(await repo.buscar(id)).toBeUndefined();
    const [{ n } = { n: -1 }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from itens_nota`;
    expect(n).toBe(0);
  });

  it("devolve undefined para id inexistente", async () => {
    expect(await repo.buscar("00000000-0000-0000-0000-000000000000")).toBeUndefined();
  });
});
