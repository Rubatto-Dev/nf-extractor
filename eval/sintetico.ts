import { fakerPT_BR as faker } from "@faker-js/faker";
import { gerarCnpj } from "../src/nf/domain/cnpj";
import { paraCentavos } from "../src/nf/domain/dinheiro";
import type { ItemNota, Nota } from "../src/nf/domain/nota";

// Notas 100% fictícias, geradas com seed fixa: nenhuma nota real entra no eval (LGPD).

export type Formato = "danfe-pdf" | "danfe-foto" | "nfce-foto";

export interface NotaSintetica {
  id: string;
  formato: Formato;
  emitente: { razaoSocial: string; endereco: string; cidade: string; ie: string };
  destinatario: { razaoSocial: string; cnpj: string };
  numero: string;
  serie: string;
  chaveAcesso: string;
  unidades: string[];
  nota: Nota;
}

export const SEED = 2026;
export const DATA_REFERENCIA = "2026-10-01";

const PRODUTOS: { nome: string; un: string; preco: [number, number]; fracionado?: boolean }[] = [
  { nome: "CANETA ESFEROGRAFICA AZUL", un: "UN", preco: [1.2, 3.5] },
  { nome: "CADERNO UNIVERSITARIO 96 FLS", un: "UN", preco: [9.9, 24.9] },
  { nome: "PAPEL A4 75G RESMA 500 FLS", un: "PCT", preco: [24.9, 39.9] },
  { nome: "GRAMPEADOR DE MESA 26/6", un: "UN", preco: [18, 45] },
  { nome: "TONER COMPATIVEL HP 85A", un: "UN", preco: [69, 149] },
  { nome: "PASTA SUSPENSA KRAFT", un: "UN", preco: [2.1, 4.5] },
  { nome: "CABO HDMI 2.0 1,5M", un: "UN", preco: [19.9, 49.9] },
  { nome: "MOUSE OPTICO USB", un: "UN", preco: [22, 79] },
  { nome: "TECLADO ABNT2 USB", un: "UN", preco: [45, 129] },
  { nome: "PARAFUSO SEXTAVADO 1/4 X 2", un: "CX", preco: [12, 38] },
  { nome: "CIMENTO CP II 50KG", un: "SC", preco: [32, 44] },
  { nome: "TINTA ACRILICA BRANCO 18L", un: "LT", preco: [189, 329] },
  { nome: "LAMPADA LED 9W BIVOLT", un: "UN", preco: [6.5, 14.9] },
  { nome: "FITA ISOLANTE 20M", un: "UN", preco: [4.9, 11.9] },
  { nome: "DETERGENTE NEUTRO 500ML", un: "UN", preco: [1.99, 3.49] },
  { nome: "CAFE TORRADO MOIDO 500G", un: "PCT", preco: [17.9, 32.9] },
  { nome: "ACUCAR CRISTAL 5KG", un: "PCT", preco: [19.9, 29.9] },
  { nome: "ARROZ TIPO 1 5KG", un: "PCT", preco: [24.9, 36.9] },
  { nome: "FEIJAO CARIOCA 1KG", un: "PCT", preco: [6.9, 10.9] },
  { nome: "BANANA PRATA", un: "KG", preco: [4.99, 8.99], fracionado: true },
  { nome: "TOMATE ITALIANO", un: "KG", preco: [5.99, 11.99], fracionado: true },
  { nome: "QUEIJO MUSSARELA FATIADO", un: "KG", preco: [39.9, 59.9], fracionado: true },
  { nome: "PAO FRANCES", un: "KG", preco: [12.9, 19.9], fracionado: true },
  { nome: "LEITE INTEGRAL 1L", un: "UN", preco: [4.29, 6.49] },
  { nome: "AGUA MINERAL 1,5L", un: "UN", preco: [2.49, 4.29] },
  { nome: "PAPEL TOALHA 2 ROLOS", un: "PCT", preco: [5.9, 9.9] },
  { nome: "SABAO EM PO 1,6KG", un: "UN", preco: [16.9, 29.9] },
  { nome: "OLEO DE SOJA 900ML", un: "UN", preco: [6.49, 9.99] },
];

const UFS = ["GO", "SP", "MG", "DF", "PR", "BA", "RJ"];
const RAMOS = ["COMERCIO", "DISTRIBUIDORA", "MATERIAIS", "SUPERMERCADO", "PAPELARIA", "ATACADO"];

function razaoSocial(sufixo: string): string {
  const ramo = faker.helpers.arrayElement(RAMOS);
  return `${ramo} ${faker.person.lastName()} ${sufixo}`.toUpperCase();
}

function entre(min: number, max: number, casas = 2): number {
  return faker.number.float({ min, max, fractionDigits: casas });
}

function cnpjFicticio(alfanumerico: boolean): string {
  const alfabeto = alfanumerico ? "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "0123456789";
  const raiz = faker.string.fromCharacters(alfabeto, 8) + "0001";
  return gerarCnpj(raiz);
}

function dataNoAnoAnterior(referencia: string): string {
  const fim = new Date(`${referencia}T12:00:00Z`).getTime();
  const d = new Date(fim - faker.number.int({ min: 0, max: 364 }) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function itens(formato: Formato): { itens: ItemNota[]; unidades: string[] } {
  const n =
    formato === "nfce-foto"
      ? faker.number.int({ min: 3, max: 12 })
      : faker.number.int({ min: 1, max: 8 });
  const escolhidos = faker.helpers.arrayElements(PRODUTOS, n);
  const lista = escolhidos.map((p) => {
    const quantidade = p.fracionado
      ? entre(0.2, 2.5, 3)
      : faker.number.int({ min: 1, max: formato === "nfce-foto" ? 6 : 40 });
    const valorUnitario = entre(p.preco[0], p.preco[1]);
    return {
      item: {
        descricao: p.nome,
        quantidade,
        valorUnitario,
        valorTotal: paraCentavos(quantidade * valorUnitario),
      },
      un: p.un,
    };
  });
  return { itens: lista.map((l) => l.item), unidades: lista.map((l) => l.un) };
}

function formatoDo(i: number): Formato {
  if (i < 10) return "danfe-pdf";
  if (i < 20) return "danfe-foto";
  return "nfce-foto";
}

export function gerarNotasSinteticas(quantidade = 30): NotaSintetica[] {
  faker.seed(SEED);
  return Array.from({ length: quantidade }, (_, i) => {
    const formato = formatoDo(i);
    const { itens: lista, unidades } = itens(formato);
    const soma = lista.reduce((a, it) => a + it.valorTotal, 0);
    const comAjuste = i % 5 === 2;
    const desconto = comAjuste ? Math.round(soma * entre(0.02, 0.1)) : 0;
    const frete = comAjuste && formato !== "nfce-foto" ? paraCentavos(entre(15, 80)) : 0;
    const uf = faker.helpers.arrayElement(UFS);

    return {
      id: `nota-${String(i + 1).padStart(2, "0")}`,
      formato,
      emitente: {
        razaoSocial: razaoSocial("LTDA"),
        endereco: `${faker.location.street()}, ${faker.location.buildingNumber()}`.toUpperCase(),
        cidade: `${faker.location.city()} - ${uf}`.toUpperCase(),
        ie: faker.string.numeric(9),
      },
      destinatario: {
        razaoSocial: razaoSocial("ME"),
        cnpj: cnpjFicticio(false),
      },
      numero: faker.string.numeric(6),
      serie: String(faker.number.int({ min: 1, max: 3 })),
      chaveAcesso: faker.string.numeric(44),
      unidades,
      nota: {
        cnpjEmitente: cnpjFicticio(i % 10 === 7),
        dataEmissao: dataNoAnoAnterior(DATA_REFERENCIA),
        valorTotal: soma - desconto + frete,
        desconto,
        frete,
        itens: lista,
      },
    };
  });
}
