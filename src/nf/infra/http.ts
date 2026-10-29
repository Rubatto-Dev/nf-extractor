import { ZodError } from "zod";
import {
  ArquivoInvalido,
  ErroExtracao,
  type MotivoFalhaExtracao,
  NotaNaoEncontrada,
  OrcamentoEsgotado,
} from "../application/erros";
import { logger } from "./logger";

const STATUS_POR_MOTIVO: Record<MotivoFalhaExtracao, number> = {
  nao_e_nota: 422,
  recusa: 422,
  requisicao_invalida: 422,
  saida_truncada: 502,
  saida_invalida: 502,
  indisponivel: 503,
};

export function respostaDeErro(err: unknown, contexto: string): Response {
  const corpo = (status: number, codigo: string, mensagem: string) =>
    Response.json({ erro: { codigo, mensagem } }, { status });

  if (err instanceof ArquivoInvalido) return corpo(422, "arquivo_invalido", err.message);
  if (err instanceof NotaNaoEncontrada) return corpo(404, "nao_encontrada", err.message);
  if (err instanceof ZodError) {
    return corpo(422, "dados_invalidos", err.issues.map((i) => i.message).join("; "));
  }
  if (err instanceof OrcamentoEsgotado) {
    logger.warn({ gasto: err.gastoUsd, teto: err.tetoUsd }, `${contexto}: teto diário atingido`);
    return corpo(429, "teto_diario", "O limite diário de extrações da demo acabou. Volte amanhã.");
  }
  if (err instanceof ErroExtracao) {
    logger.warn(
      { motivo: err.motivo, uso: err.uso, err: err.cause },
      `${contexto}: extração falhou`,
    );
    return corpo(STATUS_POR_MOTIVO[err.motivo], err.motivo, err.message);
  }
  logger.error({ err }, `${contexto}: erro inesperado`);
  return corpo(500, "erro_interno", "Erro inesperado. Tente de novo.");
}
