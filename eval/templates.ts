import { formatarCnpj } from "../src/nf/domain/cnpj";
import type { NotaSintetica } from "./sintetico";

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n: number, casas: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const chave = (c: string) => c.match(/.{4}/g)?.join(" ") ?? c;

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  table { border-collapse: collapse; width: 100%; }
`;

export function danfeHtml(s: NotaSintetica): string {
  const n = s.nota;
  const somaProdutos = n.itens.reduce((a, i) => a + i.valorTotal, 0);
  const linhas = n.itens
    .map(
      (i, k) => `<tr>
        <td>${String(k + 1).padStart(3, "0")}</td><td class="desc">${esc(i.descricao)}</td>
        <td>61089000</td><td>5102</td><td>${s.unidades[k]}</td>
        <td class="r">${num(i.quantidade, 4)}</td><td class="r">${num(i.valorUnitario, 4)}</td>
        <td class="r">${brl(i.valorTotal)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${BASE_CSS}
    .folha { width: 794px; padding: 22px; font-size: 10px; }
    .caixa { border: 1px solid #000; padding: 4px 6px; }
    .rot { font-size: 7px; text-transform: uppercase; color: #333; }
    .val { font-size: 11px; font-weight: bold; margin-top: 2px; }
    .grade { display: grid; gap: 0; margin-top: -1px; }
    .grade > div { border: 1px solid #000; margin: 0 -1px -1px 0; padding: 3px 5px; }
    h1 { font-size: 22px; letter-spacing: 2px; }
    .secao { font-size: 8px; font-weight: bold; margin: 8px 0 2px; text-transform: uppercase; }
    td, th { border: 1px solid #000; padding: 3px 4px; font-size: 9px; }
    th { font-size: 7px; text-transform: uppercase; background: #f2f2f2; }
    .r { text-align: right; } .desc { width: 34%; }
  </style></head><body><div class="folha">
    <div class="grade" style="grid-template-columns: 2.2fr 1fr 1.6fr">
      <div><div class="val" style="font-size:13px">${esc(s.emitente.razaoSocial)}</div>
        <div>${esc(s.emitente.endereco)}</div><div>${esc(s.emitente.cidade)}</div></div>
      <div style="text-align:center"><h1>DANFE</h1><div>Documento Auxiliar da Nota Fiscal Eletrônica</div>
        <div>0 - ENTRADA &nbsp; 1 - SAÍDA <b>[1]</b></div><div class="val">Nº ${s.numero}</div><div>SÉRIE ${s.serie}</div></div>
      <div><div class="rot">Chave de acesso</div><div class="val" style="font-size:9px">${chave(s.chaveAcesso)}</div>
        <div class="rot" style="margin-top:6px">Protocolo de autorização de uso</div><div>${s.chaveAcesso.slice(0, 15)} ${dataBr(n.dataEmissao)}</div></div>
    </div>
    <div class="grade" style="grid-template-columns: 2fr 1fr 1fr">
      <div><div class="rot">Natureza da operação</div><div class="val">VENDA DE MERCADORIA</div></div>
      <div><div class="rot">Inscrição estadual</div><div class="val">${s.emitente.ie}</div></div>
      <div><div class="rot">CNPJ</div><div class="val">${formatarCnpj(n.cnpjEmitente)}</div></div>
    </div>
    <div class="secao">Destinatário / Remetente</div>
    <div class="grade" style="grid-template-columns: 2.4fr 1.2fr 1fr">
      <div><div class="rot">Nome / Razão social</div><div class="val">${esc(s.destinatario.razaoSocial)}</div></div>
      <div><div class="rot">CNPJ / CPF</div><div class="val">${formatarCnpj(s.destinatario.cnpj)}</div></div>
      <div><div class="rot">Data da emissão</div><div class="val">${dataBr(n.dataEmissao)}</div></div>
    </div>
    <div class="secao">Cálculo do imposto</div>
    <div class="grade" style="grid-template-columns: repeat(6, 1fr)">
      <div><div class="rot">Base de cálc. ICMS</div><div class="val">0,00</div></div>
      <div><div class="rot">Valor do ICMS</div><div class="val">0,00</div></div>
      <div><div class="rot">V. total produtos</div><div class="val">${brl(somaProdutos)}</div></div>
      <div><div class="rot">Valor do frete</div><div class="val">${brl(n.frete)}</div></div>
      <div><div class="rot">Desconto</div><div class="val">${brl(n.desconto)}</div></div>
      <div><div class="rot">V. total da nota</div><div class="val">${brl(n.valorTotal)}</div></div>
    </div>
    <div class="secao">Dados dos produtos / serviços</div>
    <table><thead><tr><th>Cód.</th><th>Descrição do produto / serviço</th><th>NCM/SH</th><th>CFOP</th>
      <th>Un.</th><th>Quant.</th><th>V. unitário</th><th>V. total</th></tr></thead><tbody>${linhas}</tbody></table>
    <div class="secao">Dados adicionais</div>
    <div class="caixa" style="min-height:48px">Documento emitido por ME ou EPP optante pelo Simples Nacional.
      Nota fictícia gerada para testes — sem valor fiscal.</div>
  </div></body></html>`;
}

export function nfceHtml(s: NotaSintetica): string {
  const n = s.nota;
  const linhas = n.itens
    .map(
      (i, k) => `<tr><td colspan="4">${String(k + 1).padStart(3, "0")} ${esc(i.descricao)}</td></tr>
        <tr><td></td><td>${num(i.quantidade, i.quantidade % 1 ? 3 : 0)} ${s.unidades[k]} x ${num(i.valorUnitario, 2)}</td>
        <td></td><td class="r">${brl(i.valorTotal)}</td></tr>`,
    )
    .join("");
  const soma = n.itens.reduce((a, i) => a + i.valorTotal, 0);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${BASE_CSS}
    .cupom { width: 380px; padding: 18px 16px; font-family: "Courier New", monospace; font-size: 12px; }
    .c { text-align: center; } .r { text-align: right; } hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    td { padding: 1px 0; vertical-align: top; } .tot td { font-weight: bold; font-size: 13px; }
  </style></head><body><div class="cupom">
    <div class="c"><b>${esc(s.emitente.razaoSocial)}</b></div>
    <div class="c">CNPJ: ${formatarCnpj(n.cnpjEmitente)} IE: ${s.emitente.ie}</div>
    <div class="c">${esc(s.emitente.endereco)}</div><div class="c">${esc(s.emitente.cidade)}</div>
    <hr><div class="c"><b>DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA</b></div><hr>
    <table>${linhas}</table><hr>
    <table>
      <tr><td>QTD. TOTAL DE ITENS</td><td class="r">${n.itens.length}</td></tr>
      <tr><td>VALOR TOTAL R$</td><td class="r">${brl(soma)}</td></tr>
      ${n.desconto ? `<tr><td>DESCONTO R$</td><td class="r">-${brl(n.desconto)}</td></tr>` : ""}
      <tr class="tot"><td>VALOR A PAGAR R$</td><td class="r">${brl(n.valorTotal)}</td></tr>
      <tr><td>FORMA DE PAGAMENTO</td><td class="r">CARTÃO DE DÉBITO</td></tr>
    </table><hr>
    <div class="c">NFC-e nº ${s.numero} Série ${s.serie} ${dataBr(n.dataEmissao)} 14:32:07</div>
    <div class="c">Consulte pela chave de acesso em www.sefaz.gov.br/nfce</div>
    <div class="c" style="font-size:10px">${chave(s.chaveAcesso)}</div>
    <div class="c">CONSUMIDOR NÃO IDENTIFICADO</div>
    <div class="c" style="margin-top:6px;font-size:10px">Nota fictícia gerada para testes — sem valor fiscal</div>
  </div></body></html>`;
}

/** Envolve a nota numa "foto": mesa, sombra, inclinação e leve desfoque. */
export function fotoHtml(conteudo: string, angulo: number, inclinacao: number): string {
  const corpo = conteudo.replace(/^[\s\S]*<body>/, "").replace(/<\/body>[\s\S]*$/, "");
  const estilo = conteudo.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${estilo}
    body { background: transparent; }
    .cena { display: inline-block; padding: 70px; background: radial-gradient(circle at 30% 20%, #8a7560, #4b3d30); }
    .papel { background: #fbfaf6; box-shadow: 8px 14px 30px rgba(0,0,0,.55);
      transform: perspective(1400px) rotateX(${inclinacao}deg) rotate(${angulo}deg);
      filter: blur(0.45px) contrast(1.06) brightness(0.97); }
  </style></head><body><div class="cena"><div class="papel">${corpo}</div></div></body></html>`;
}
