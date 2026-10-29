import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ArquivoInvalido,
  ErroExtracao,
  NotaComSinalizacoes,
  NotaNaoEncontrada,
  OrcamentoEsgotado,
} from "../application/erros";
import { respostaDeErro } from "./http";

vi.mock("./logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

const zodErro = z.object({ a: z.string() }).safeParse({}).error;

describe("respostaDeErro", () => {
  it.each([
    [new ArquivoInvalido("vazio"), 422, "arquivo_invalido"],
    [new NotaNaoEncontrada("x"), 404, "nao_encontrada"],
    [new NotaComSinalizacoes(2), 422, "nota_com_alertas"],
    [zodErro, 422, "dados_invalidos"],
    [new OrcamentoEsgotado(1.2, 1), 429, "teto_diario"],
    [new ErroExtracao("nao_e_nota", "não é nota"), 422, "nao_e_nota"],
    [new ErroExtracao("saida_truncada", "cortou"), 502, "saida_truncada"],
    [new ErroExtracao("indisponivel", "fora"), 503, "indisponivel"],
    [new Error("segredo interno"), 500, "erro_interno"],
  ])("%s → %i", async (err, status, codigo) => {
    const r = respostaDeErro(err, "teste");
    expect(r.status).toBe(status);
    const corpo = await r.json();
    expect(corpo.erro.codigo).toBe(codigo);
    expect(JSON.stringify(corpo)).not.toContain("segredo interno");
  });
});
