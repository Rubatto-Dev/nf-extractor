import type { Centavos } from "./dinheiro";

export interface ItemNota {
  descricao: string;
  quantidade: number;
  /** em reais, até 4 casas (preço unitário pode ter fração de centavo) */
  valorUnitario: number;
  valorTotal: Centavos;
}

export interface Nota {
  cnpjEmitente: string;
  /** ISO, AAAA-MM-DD */
  dataEmissao: string;
  valorTotal: Centavos;
  desconto: Centavos;
  frete: Centavos;
  itens: ItemNota[];
}

export type CodigoSinalizacao =
  | "cnpj_invalido"
  | "sem_itens"
  | "total_invalido"
  | "soma_divergente"
  | "data_invalida"
  | "data_futura"
  | "data_antiga"
  | "item_inconsistente";

export interface Sinalizacao {
  codigo: CodigoSinalizacao;
  mensagem: string;
  /** índice do item, quando a sinalização é de um item */
  item?: number;
}
