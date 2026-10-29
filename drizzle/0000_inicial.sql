CREATE TYPE "public"."status_documento" AS ENUM('extraindo', 'revisao', 'aprovada', 'falhou');--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_arquivo" text NOT NULL,
	"mime" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	"status" "status_documento" DEFAULT 'extraindo' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "extracoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documento_id" uuid NOT NULL,
	"modelo" text NOT NULL,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_saida" integer DEFAULT 0 NOT NULL,
	"custo_usd" numeric(10, 6) DEFAULT 0 NOT NULL,
	"latencia_ms" integer DEFAULT 0 NOT NULL,
	"saida_bruta" jsonb,
	"erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_nota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documento_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"descricao" text NOT NULL,
	"quantidade" numeric(15, 4) NOT NULL,
	"valor_unitario" numeric(15, 4) NOT NULL,
	"valor_total_centavos" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"documento_id" uuid PRIMARY KEY NOT NULL,
	"cnpj_emitente" varchar(18) NOT NULL,
	"data_emissao" text NOT NULL,
	"valor_total_centavos" bigint NOT NULL,
	"desconto_centavos" bigint DEFAULT 0 NOT NULL,
	"frete_centavos" bigint DEFAULT 0 NOT NULL,
	"revisado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "extracoes" ADD CONSTRAINT "extracoes_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_nota" ADD CONSTRAINT "itens_nota_documento_id_notas_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."notas"("documento_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documentos_criado_em_idx" ON "documentos" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "extracoes_criado_em_idx" ON "extracoes" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "itens_nota_documento_idx" ON "itens_nota" USING btree ("documento_id","ordem");