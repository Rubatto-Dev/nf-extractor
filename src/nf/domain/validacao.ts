import { cnpjValido } from "./cnpj";
import { formatarDecimalBr, formatarReais, paraCentavos } from "./dinheiro";
import type { Nota, Sinalizacao } from "./nota";

// prazo de guarda dos documentos fiscais
const ANOS_PLAUSIVEIS = 5;
const TOLERANCIA_ITEM_CENTAVOS = 1;

function dataIsoValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(data);
}

function anosAntes(data: string, anos: number): string {
  return `${Number(data.slice(0, 4)) - anos}${data.slice(4)}`;
}

function validarData(data: string, hoje: string): Sinalizacao | undefined {
  if (!dataIsoValida(data)) {
    return { codigo: "data_invalida", mensagem: `Data "${data}" não é uma data válida.` };
  }
  if (data > hoje) {
    return { codigo: "data_futura", mensagem: `Data de emissão ${data} está no futuro.` };
  }
  if (data < anosAntes(hoje, ANOS_PLAUSIVEIS)) {
    return {
      codigo: "data_antiga",
      mensagem: `Data de emissão ${data} tem mais de ${ANOS_PLAUSIVEIS} anos.`,
    };
  }
  return undefined;
}

export function validarNota(nota: Nota, hoje: string): Sinalizacao[] {
  const s: Sinalizacao[] = [];

  if (!cnpjValido(nota.cnpjEmitente)) {
    s.push({
      codigo: "cnpj_invalido",
      mensagem: `CNPJ ${nota.cnpjEmitente} não confere com o dígito verificador.`,
    });
  }

  if (nota.itens.length === 0) {
    s.push({ codigo: "sem_itens", mensagem: "A nota não tem itens." });
  }

  if (nota.valorTotal <= 0) {
    s.push({ codigo: "total_invalido", mensagem: "O valor total precisa ser maior que zero." });
  } else if (nota.itens.length > 0) {
    const somaItens = nota.itens.reduce((acc, i) => acc + i.valorTotal, 0);
    const esperado = somaItens - nota.desconto + nota.frete;
    if (esperado !== nota.valorTotal) {
      s.push({
        codigo: "soma_divergente",
        mensagem:
          `Itens − desconto + frete dão ${formatarReais(esperado)}, mas o total é ` +
          `${formatarReais(nota.valorTotal)} (diferença de ${formatarReais(Math.abs(esperado - nota.valorTotal))}).`,
      });
    }
  }

  const data = validarData(nota.dataEmissao, hoje);
  if (data) s.push(data);

  nota.itens.forEach((item, i) => {
    const calculado = paraCentavos(item.quantidade * item.valorUnitario);
    if (Math.abs(calculado - item.valorTotal) > TOLERANCIA_ITEM_CENTAVOS) {
      s.push({
        codigo: "item_inconsistente",
        item: i,
        mensagem:
          `Item ${i + 1}: ${formatarDecimalBr(item.quantidade, 0, 4)} × ` +
          `${formatarDecimalBr(item.valorUnitario, 2, 4)} = ${formatarReais(calculado)}, ` +
          `mas o total do item é ${formatarReais(item.valorTotal)}.`,
      });
    }
  });

  return s;
}

export function notaAprovavel(nota: Nota, hoje: string): boolean {
  return validarNota(nota, hoje).length === 0;
}
