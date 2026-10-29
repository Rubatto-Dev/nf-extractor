import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const centavos = (nome: string) => bigint(nome, { mode: "number" });
const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();

export const statusDocumento = pgEnum("status_documento", [
  "extraindo",
  "revisao",
  "aprovada",
  "falhou",
]);

export const documentos = pgTable(
  "documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nomeArquivo: text("nome_arquivo").notNull(),
    mime: text("mime").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull().unique(),
    tamanhoBytes: integer("tamanho_bytes").notNull(),
    status: statusDocumento("status").notNull().default("extraindo"),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documentos_criado_em_idx").on(t.criadoEm)],
);

export const extracoes = pgTable(
  "extracoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentoId: uuid("documento_id")
      .notNull()
      .references(() => documentos.id, { onDelete: "cascade" }),
    modelo: text("modelo").notNull(),
    tokensEntrada: integer("tokens_entrada").notNull().default(0),
    tokensSaida: integer("tokens_saida").notNull().default(0),
    custoUsd: numeric("custo_usd", { precision: 10, scale: 6, mode: "number" })
      .notNull()
      .default(0),
    latenciaMs: integer("latencia_ms").notNull().default(0),
    saidaBruta: jsonb("saida_bruta"),
    erro: text("erro"),
    criadoEm: criadoEm(),
  },
  (t) => [index("extracoes_criado_em_idx").on(t.criadoEm)],
);

export const notas = pgTable("notas", {
  documentoId: uuid("documento_id")
    .primaryKey()
    .references(() => documentos.id, { onDelete: "cascade" }),
  cnpjEmitente: varchar("cnpj_emitente", { length: 18 }).notNull(),
  // text e não date: a data extraída pode vir inválida e precisa chegar à revisão como veio
  dataEmissao: text("data_emissao").notNull(),
  valorTotalCentavos: centavos("valor_total_centavos").notNull(),
  descontoCentavos: centavos("desconto_centavos").notNull().default(0),
  freteCentavos: centavos("frete_centavos").notNull().default(0),
  revisadoEm: timestamp("revisado_em", { withTimezone: true }),
});

export const itensNota = pgTable(
  "itens_nota",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentoId: uuid("documento_id")
      .notNull()
      .references(() => notas.documentoId, { onDelete: "cascade" }),
    ordem: integer("ordem").notNull(),
    descricao: text("descricao").notNull(),
    quantidade: numeric("quantidade", { precision: 15, scale: 4, mode: "number" }).notNull(),
    valorUnitario: numeric("valor_unitario", { precision: 15, scale: 4, mode: "number" }).notNull(),
    valorTotalCentavos: centavos("valor_total_centavos").notNull(),
  },
  (t) => [index("itens_nota_documento_idx").on(t.documentoId, t.ordem)],
);
