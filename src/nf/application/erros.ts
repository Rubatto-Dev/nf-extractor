import type { UsoModelo } from "./portas";

export type MotivoFalhaExtracao =
  | "recusa"
  | "saida_truncada"
  | "saida_invalida"
  | "nao_e_nota"
  | "indisponivel"
  | "requisicao_invalida";

export class ErroExtracao extends Error {
  constructor(
    readonly motivo: MotivoFalhaExtracao,
    mensagem: string,
    readonly uso?: UsoModelo,
    options?: ErrorOptions,
  ) {
    super(mensagem, options);
    this.name = "ErroExtracao";
  }
}

export class OrcamentoEsgotado extends Error {
  constructor(
    readonly gastoUsd: number,
    readonly tetoUsd: number,
  ) {
    super(`Teto diário de US$ ${tetoUsd} atingido (gasto: US$ ${gastoUsd.toFixed(4)}).`);
    this.name = "OrcamentoEsgotado";
  }
}

export class ArquivoInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ArquivoInvalido";
  }
}

export class NotaNaoEncontrada extends Error {
  constructor(readonly id: string) {
    super(`Nota ${id} não encontrada.`);
    this.name = "NotaNaoEncontrada";
  }
}

export class NotaComSinalizacoes extends Error {
  constructor(readonly quantidade: number) {
    super(`A nota tem ${quantidade} alerta(s) e não pode ser aprovada.`);
    this.name = "NotaComSinalizacoes";
  }
}
