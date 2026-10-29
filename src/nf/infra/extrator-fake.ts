import type { Arquivo, Extrator, ResultadoExtracao } from "../application/portas";

// Extrator sem rede: devolve sempre a mesma nota fictícia. Serve aos testes e2e e a
// subir o app sem chave da API. Nunca é usado para medir qualidade.
export class ExtratorFake implements Extrator {
  async extrair(arquivo: Arquivo): Promise<ResultadoExtracao> {
    return {
      modelo: "fake",
      tokensEntrada: 0,
      tokensSaida: 0,
      custoUsd: 0,
      latenciaMs: 0,
      saidaBruta: { fake: true, arquivo: arquivo.nome },
      nota: {
        cnpjEmitente: "11222333000181",
        dataEmissao: "2026-10-20",
        valorTotal: 4200,
        desconto: 500,
        frete: 1200,
        itens: [
          {
            descricao: "Caneta esferográfica azul",
            quantidade: 10,
            valorUnitario: 1.5,
            valorTotal: 1500,
          },
          {
            descricao: "Caderno universitário 96 fls",
            quantidade: 2,
            valorUnitario: 10,
            valorTotal: 2000,
          },
        ],
      },
    };
  }
}
