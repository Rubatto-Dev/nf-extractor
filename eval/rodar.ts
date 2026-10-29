import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import type { MimeAceito } from "../src/nf/application/portas";
import type { Nota } from "../src/nf/domain/nota";
import { ClaudeExtrator } from "../src/nf/infra/claude-extrator";
import { calcularRelatorio, type Execucao } from "./metricas";
import { DATA_REFERENCIA } from "./sintetico";

// Uso: npm run eval -- --model claude-opus-5-5 [--limite 3] [--concorrencia 3]
// GASTA COM A API. Pré-requisitos: npm run eval:gerar e ANTHROPIC_API_KEY no .env.

interface ItemGabarito {
  id: string;
  arquivo: string;
  formato: string;
  nota: Nota;
}

const { values } = parseArgs({
  options: {
    model: { type: "string", default: "claude-opus-5-5" },
    limite: { type: "string" },
    concorrencia: { type: "string", default: "3" },
  },
});

const mimeDe = (arquivo: string): MimeAceito =>
  arquivo.endsWith(".pdf") ? "application/pdf" : "image/jpeg";

async function main() {
  const gabarito = JSON.parse(await readFile("eval/gabarito.json", "utf8")) as ItemGabarito[];
  const alvo = values.limite ? gabarito.slice(0, Number(values.limite)) : gabarito;
  const extrator = new ClaudeExtrator(new Anthropic(), values.model);
  const execucoes: (Execucao & { formato: string })[] = [];

  const fila = [...alvo];
  async function trabalhador() {
    for (let g = fila.shift(); g; g = fila.shift()) {
      const bytes = new Uint8Array(await readFile(`eval/notas/${g.arquivo}`));
      try {
        const r = await extrator.extrair({ nome: g.arquivo, mime: mimeDe(g.arquivo), bytes });
        execucoes.push({
          id: g.id,
          formato: g.formato,
          esperado: g.nota,
          obtido: r.nota,
          custoUsd: r.custoUsd,
          latenciaMs: r.latenciaMs,
        });
        console.log(`${g.id} ok  ${r.latenciaMs} ms  US$ ${r.custoUsd.toFixed(4)}`);
      } catch (err) {
        const uso = (err as { uso?: { custoUsd: number; latenciaMs: number } }).uso;
        execucoes.push({
          id: g.id,
          formato: g.formato,
          esperado: g.nota,
          obtido: null,
          erro: String(err),
          custoUsd: uso?.custoUsd ?? 0,
          latenciaMs: uso?.latenciaMs ?? 0,
        });
        console.log(`${g.id} FALHOU ${String(err)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Number(values.concorrencia) }, trabalhador));
  execucoes.sort((a, b) => a.id.localeCompare(b.id));

  const geral = calcularRelatorio(execucoes, DATA_REFERENCIA);
  const formatos = [...new Set(execucoes.map((e) => e.formato))];
  const porFormato = Object.fromEntries(
    formatos.map((f) => [
      f,
      calcularRelatorio(
        execucoes.filter((e) => e.formato === f),
        DATA_REFERENCIA,
      ),
    ]),
  );

  const data = new Date().toISOString().slice(0, 10);
  const saida = `eval/resultados/${data}-${values.model}${values.limite ? `-amostra${values.limite}` : ""}.json`;
  await mkdir("eval/resultados", { recursive: true });
  await writeFile(
    saida,
    `${JSON.stringify({ modelo: values.model, data, geral, porFormato, execucoes }, null, 2)}\n`,
  );
  console.log(JSON.stringify(geral, null, 2));
  console.log(`resultado em ${saida}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
