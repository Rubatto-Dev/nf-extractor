import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ErroExtracao } from "../application/erros";
import type { Arquivo, Extrator, ResultadoExtracao, UsoModelo } from "../application/portas";
import { normalizarCnpj } from "../domain/cnpj";
import { paraCentavos } from "../domain/dinheiro";
import type { Nota } from "../domain/nota";
import { custoUsd, modeloTemPreco } from "./precos";

export const SchemaExtracao = z.object({
  tipo: z
    .enum(["nfe", "nfce", "outro"])
    .describe("nfe = DANFE de NF-e; nfce = cupom NFC-e; outro = não é nota fiscal de produto"),
  cnpj_emitente: z.string().describe("CNPJ do emitente exatamente como impresso"),
  data_emissao: z.string().describe("data de emissão no formato AAAA-MM-DD"),
  valor_total: z.number().describe("valor total da nota, em reais"),
  desconto: z.number().describe("desconto total em reais; 0 se não houver"),
  frete: z
    .number()
    .describe("frete + seguro + outras despesas somados ao total, em reais; 0 se não houver"),
  itens: z.array(
    z.object({
      descricao: z.string(),
      quantidade: z.number(),
      valor_unitario: z.number().describe("em reais"),
      valor_total: z.number().describe("valor total do item, em reais"),
    }),
  ),
});

export type DadosExtraidos = z.infer<typeof SchemaExtracao>;

const SISTEMA = `Você extrai dados de notas fiscais brasileiras (DANFE de NF-e ou cupom de NFC-e) a partir de foto ou PDF.

Regras:
- Copie os valores como estão impressos. Não corrija contas nem complete dados que não aparecem.
- O emitente é quem vendeu (cabeçalho da nota), nunca o destinatário.
- Datas no formato AAAA-MM-DD. Valores em reais, com ponto decimal.
- Liste todos os itens, na ordem da nota.
- Se o documento não for uma nota fiscal de produto, responda com tipo "outro" e os demais campos vazios ou zero.`;

type ClienteAnthropic = { beta: { messages: Pick<Anthropic["beta"]["messages"], "parse"> } };

export function paraNota(d: DadosExtraidos): Nota {
  return {
    cnpjEmitente: normalizarCnpj(d.cnpj_emitente),
    dataEmissao: d.data_emissao,
    valorTotal: paraCentavos(d.valor_total),
    desconto: paraCentavos(d.desconto),
    frete: paraCentavos(d.frete),
    itens: d.itens.map((i) => ({
      descricao: i.descricao.trim(),
      quantidade: i.quantidade,
      valorUnitario: i.valor_unitario,
      valorTotal: paraCentavos(i.valor_total),
    })),
  };
}

function blocoArquivo(arquivo: Arquivo) {
  const data = Buffer.from(arquivo.bytes).toString("base64");
  if (arquivo.mime === "application/pdf") {
    return {
      type: "document" as const,
      source: { type: "base64" as const, media_type: "application/pdf" as const, data },
    };
  }
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: arquivo.mime, data },
  };
}

function erroDaApi(err: unknown): ErroExtracao {
  if (err instanceof Anthropic.RateLimitError) {
    return new ErroExtracao("indisponivel", "Limite de requisições da API atingido.", undefined, {
      cause: err,
    });
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new ErroExtracao("requisicao_invalida", "A API recusou o arquivo enviado.", undefined, {
      cause: err,
    });
  }
  if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.InternalServerError) {
    return new ErroExtracao("indisponivel", "A API está indisponível.", undefined, { cause: err });
  }
  if (err instanceof Anthropic.APIError) {
    return new ErroExtracao("indisponivel", `Erro da API (${err.status}).`, undefined, {
      cause: err,
    });
  }
  return new ErroExtracao(
    "saida_invalida",
    "A resposta do modelo não seguiu o formato.",
    undefined,
    {
      cause: err,
    },
  );
}

export class ClaudeExtrator implements Extrator {
  constructor(
    private readonly client: ClienteAnthropic,
    private readonly modelo: string,
    private readonly relogio: () => number = () => performance.now(),
  ) {}

  async extrair(arquivo: Arquivo): Promise<ResultadoExtracao> {
    const inicio = this.relogio();
    let resposta;
    try {
      resposta = await this.client.beta.messages.parse({
        model: this.modelo,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SISTEMA,
        output_config: { effort: "low", format: betaZodOutputFormat(SchemaExtracao) },
        messages: [
          {
            role: "user",
            content: [
              blocoArquivo(arquivo),
              { type: "text", text: "Extraia os dados desta nota." },
            ],
          },
        ],
      });
    } catch (err) {
      throw erroDaApi(err);
    }

    const servidoPor = modeloTemPreco(resposta.model) ? resposta.model : this.modelo;
    const { input_tokens, output_tokens } = resposta.usage;
    const uso: UsoModelo = {
      modelo: servidoPor,
      tokensEntrada: input_tokens,
      tokensSaida: output_tokens,
      custoUsd: custoUsd(servidoPor, input_tokens, output_tokens),
      latenciaMs: Math.round(this.relogio() - inicio),
    };

    if (resposta.stop_reason === "refusal") {
      throw new ErroExtracao("recusa", "O modelo se recusou a processar o documento.", uso);
    }
    if (resposta.stop_reason === "max_tokens") {
      throw new ErroExtracao("saida_truncada", "A resposta do modelo foi cortada.", uso);
    }
    const dados = resposta.parsed_output;
    if (!dados) throw new ErroExtracao("saida_invalida", "O modelo não devolveu os dados.", uso);
    if (dados.tipo === "outro") {
      throw new ErroExtracao("nao_e_nota", "O documento não parece ser uma nota fiscal.", uso);
    }
    return { ...uso, nota: paraNota(dados), saidaBruta: dados };
  }
}
