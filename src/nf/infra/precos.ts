// US$ por milhão de tokens (tabela pública da Anthropic, out/2026).
// Prompt cacheado não é usado aqui: o prompt fixo é menor que o mínimo cacheável.
const PRECOS: Record<string, { entrada: number; saida: number }> = {
  "claude-opus-5-5": { entrada: 4, saida: 20 },
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-opus-4-8": { entrada: 5, saida: 25 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10 },
  "claude-sonnet-5": { entrada: 2, saida: 10 },
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5 },
};

export function modeloTemPreco(modelo: string): boolean {
  return modelo in PRECOS;
}

export function custoUsd(modelo: string, tokensEntrada: number, tokensSaida: number): number {
  const p = PRECOS[modelo];
  if (!p) throw new Error(`modelo sem preço cadastrado: ${modelo}`);
  return (tokensEntrada * p.entrada + tokensSaida * p.saida) / 1_000_000;
}
