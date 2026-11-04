import type { Arquivo, Extrator, ResultadoExtracao } from "../application/portas";
import type { Nota } from "../domain/nota";
import amostras from "./amostras.json";

// Gabarito das notas de exemplo de public/amostras (as notas 01, 13 e 23 do eval), para a
// demo sem IA mostrar dados que batem com o documento.
const GABARITO_AMOSTRAS: Record<string, Nota> = amostras;

const NOTA_PADRAO: Nota = {
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
};

// Extrator sem rede: devolve o gabarito das notas de exemplo e uma nota fictícia fixa para
// qualquer outro arquivo. Serve aos testes e2e, à demo pública e a subir o app sem chave da
// API. Nunca é usado para medir qualidade.
export class ExtratorFake implements Extrator {
  async extrair(arquivo: Arquivo): Promise<ResultadoExtracao> {
    return {
      modelo: "fake",
      tokensEntrada: 0,
      tokensSaida: 0,
      custoUsd: 0,
      latenciaMs: 0,
      saidaBruta: { fake: true, arquivo: arquivo.nome },
      nota: GABARITO_AMOSTRAS[arquivo.nome] ?? NOTA_PADRAO,
    };
  }
}
