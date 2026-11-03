import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { Arquivo } from "../application/portas";
import { ClaudeExtrator, type DadosExtraidos, paraNota } from "./claude-extrator";

const dados: DadosExtraidos = {
  tipo: "nfe",
  cnpj_emitente: "11.222.333/0001-81",
  data_emissao: "2026-10-20",
  valor_total: 42,
  desconto: 5,
  frete: 12,
  itens: [
    { descricao: " Caneta ", quantidade: 10, valor_unitario: 1.5, valor_total: 15 },
    { descricao: "Caderno", quantidade: 2, valor_unitario: 10, valor_total: 20 },
  ],
};

const pdf: Arquivo = { nome: "n.pdf", mime: "application/pdf", bytes: new Uint8Array([1, 2, 3]) };
const png: Arquivo = { nome: "n.png", mime: "image/png", bytes: new Uint8Array([4, 5]) };

function resposta(parcial: Record<string, unknown> = {}) {
  return {
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    usage: { input_tokens: 3000, output_tokens: 1000 },
    parsed_output: dados,
    ...parcial,
  };
}

function extrator(parse: ReturnType<typeof vi.fn>) {
  let t = 0;
  const relogio = () => (t += 1500);
  return new ClaudeExtrator({ beta: { messages: { parse } } } as never, "claude-opus-5-5", relogio);
}

describe("ClaudeExtrator", () => {
  it("extrai, converte para centavos e calcula custo e latência", async () => {
    const parse = vi.fn().mockResolvedValue(resposta());
    const r = await extrator(parse).extrair(pdf);

    expect(r.nota).toEqual({
      cnpjEmitente: "11222333000181",
      dataEmissao: "2026-10-20",
      valorTotal: 4200,
      desconto: 500,
      frete: 1200,
      itens: [
        { descricao: "Caneta", quantidade: 10, valorUnitario: 1.5, valorTotal: 1500 },
        { descricao: "Caderno", quantidade: 2, valorUnitario: 10, valorTotal: 2000 },
      ],
    });
    // 3000 × $4/M + 1000 × $20/M
    expect(r.custoUsd).toBeCloseTo(0.032, 6);
    expect(r).toMatchObject({ modelo: "claude-opus-5-5", latenciaMs: 1500, tokensEntrada: 3000 });
  });

  it("manda PDF como document e imagem como image, com fallback de recusa", async () => {
    const parse = vi.fn().mockResolvedValue(resposta());
    await extrator(parse).extrair(pdf);
    await extrator(parse).extrair(png);

    const [primeira] = parse.mock.calls[0]!;
    expect(primeira).toMatchObject({ fallbacks: "default", output_config: { effort: "low" } });
    expect(primeira.messages[0].content[0]).toMatchObject({
      type: "document",
      source: { media_type: "application/pdf", data: "AQID" },
    });
    expect(parse.mock.calls[1]![0].messages[0].content[0]).toMatchObject({
      type: "image",
      source: { media_type: "image/png" },
    });
  });

  it("cobra pelo modelo que atendeu quando o fallback entra", async () => {
    const parse = vi.fn().mockResolvedValue(resposta({ model: "claude-opus-4-8" }));
    const r = await extrator(parse).extrair(pdf);
    expect(r.modelo).toBe("claude-opus-4-8");
    expect(r.custoUsd).toBeCloseTo(0.04, 6);
  });

  it("usa o preço do modelo pedido quando o servido não tem preço cadastrado", async () => {
    const parse = vi.fn().mockResolvedValue(resposta({ model: "claude-opus-5-5-xyz" }));
    expect((await extrator(parse).extrair(pdf)).modelo).toBe("claude-opus-5-5");
  });

  it.each([
    [{ stop_reason: "refusal" }, "recusa"],
    [{ stop_reason: "max_tokens" }, "saida_truncada"],
    [{ parsed_output: null }, "saida_invalida"],
    [{ parsed_output: { ...dados, tipo: "outro" } }, "nao_e_nota"],
  ])("falha com motivo explícito e mantém o custo (%o)", async (parcial, motivo) => {
    const parse = vi.fn().mockResolvedValue(resposta(parcial));
    await expect(extrator(parse).extrair(pdf)).rejects.toMatchObject({
      motivo,
      uso: { custoUsd: expect.any(Number) },
    });
  });

  it.each([
    [new Anthropic.RateLimitError(429, undefined, "rate", new Headers()), "indisponivel"],
    [new Anthropic.BadRequestError(400, undefined, "bad", new Headers()), "requisicao_invalida"],
    [new Anthropic.InternalServerError(500, undefined, "x", new Headers()), "indisponivel"],
    [new Anthropic.APIConnectionError({ message: "rede" }), "indisponivel"],
    [new Anthropic.APIError(418, undefined, "chá", new Headers()), "indisponivel"],
    [new SyntaxError("json"), "saida_invalida"],
  ])("traduz %s da API em erro tipado", async (erro, motivo) => {
    const parse = vi.fn().mockRejectedValue(erro);
    await expect(extrator(parse).extrair(pdf)).rejects.toMatchObject({ motivo, uso: undefined });
  });

  it("repassa o motivo que a API deu para o 400", async () => {
    const corpo = {
      type: "error",
      error: { type: "invalid_request_error", message: "Your credit balance is too low." },
    };
    const parse = vi
      .fn()
      .mockRejectedValue(new Anthropic.BadRequestError(400, corpo, "bad", new Headers()));
    await expect(extrator(parse).extrair(pdf)).rejects.toMatchObject({
      motivo: "requisicao_invalida",
      message: "A API recusou a requisição: Your credit balance is too low.",
    });
  });
});

describe("paraNota", () => {
  it("arredonda valores para centavos", () => {
    const n = paraNota({ ...dados, valor_total: 0.1 + 0.2, itens: [] });
    expect(n.valorTotal).toBe(30);
  });
});
