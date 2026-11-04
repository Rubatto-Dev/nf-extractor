import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { type LinhaPainel, montarPainel } from "@/nf/application/notas";
import { formatarCnpj } from "@/nf/domain/cnpj";
import { hojeEmBrasilia, isoParaBr } from "@/nf/domain/datas";
import { formatarReais } from "@/nf/domain/dinheiro";
import { getConfig } from "@/nf/infra/config";
import { repositorio } from "@/nf/infra/container";
import { AvisoSemIa } from "@/ui/aviso-sem-ia";
import { BarraLateral } from "@/ui/barra-lateral";
import { BotaoExemplo, EnvioProvider, ZonaEnvio } from "@/ui/envio";
import { IconeBaixar } from "@/ui/icones";
import { Pilula } from "@/ui/pilula";

type Filtro = "todas" | "revisao" | "aprovada";

const usd = (v: number) =>
  `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function rotuloAcao(situacao: LinhaPainel["situacao"]) {
  if (situacao === "aprovada") return "Ver";
  return situacao === "falhou" ? "Detalhes" : "Revisar";
}

function filtrar(linhas: LinhaPainel[], filtro: Filtro) {
  if (filtro === "revisao") {
    return linhas.filter((l) => l.situacao === "revisao" || l.situacao === "divergente");
  }
  if (filtro === "aprovada") return linhas.filter((l) => l.situacao === "aprovada");
  return linhas;
}

function Cartao({
  valor,
  rotulo,
  alerta,
}: Readonly<{ valor: string; rotulo: string; alerta?: boolean }>) {
  return (
    <div className="rounded-cartao bg-superficie px-4.5 py-4 shadow-cartao">
      <div
        className={`text-[26px] font-semibold tracking-tight ${alerta ? "text-alerta" : "text-tinta"}`}
      >
        {valor}
      </div>
      <div className="mt-0.5 text-[13px] text-secundario">{rotulo}</div>
    </div>
  );
}

function Segmento({
  filtro,
  atual,
  rotulo,
}: Readonly<{ filtro: Filtro; atual: Filtro; rotulo: string }>) {
  const ativo = filtro === atual;
  return (
    <Link
      href={filtro === "todas" ? "/" : `/?filtro=${filtro}`}
      aria-current={ativo ? "page" : undefined}
      className={`flex h-7 items-center rounded-[7px] px-3 text-[13px] text-tinta ${
        ativo ? "bg-superficie shadow-[0_1px_2px_rgb(0_0_0/0.1)]" : ""
      }`}
    >
      {rotulo}
    </Link>
  );
}

async function Painel({
  searchParams,
}: Readonly<{ searchParams: PageProps<"/">["searchParams"] }>) {
  await connection();
  const { filtro: bruto } = await searchParams;
  const filtro: Filtro = bruto === "revisao" || bruto === "aprovada" ? bruto : "todas";
  const agora = new Date();
  const painel = await montarPainel(repositorio(), agora, hojeEmBrasilia(agora));
  const linhas = filtrar(painel.linhas, filtro);
  const { contagem } = painel;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <BarraLateral
        ativo={filtro}
        contagem={{
          todas: painel.linhas.length,
          revisao: contagem.revisao,
          aprovada: contagem.aprovada,
        }}
      />
      <EnvioProvider>
        <main className="flex min-w-0 max-w-[1200px] flex-1 flex-col gap-6 px-5 py-8 md:px-10">
          <header className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[28px] font-bold tracking-tight">Notas</h1>
              <p className="text-sm text-secundario">
                Envie foto ou PDF. O Claude extrai, as regras conferem e você revisa.
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <BotaoExemplo />
              <a
                href="/api/export"
                aria-disabled={contagem.aprovada === 0}
                className={`flex h-9 items-center gap-1.5 rounded-full bg-acao px-4 text-sm font-medium text-white hover:bg-acao-escura ${
                  contagem.aprovada === 0 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <IconeBaixar tamanho={14} /> Exportar CSV ({contagem.aprovada})
              </a>
            </div>
          </header>

          {getConfig().EXTRACTOR === "fake" && <AvisoSemIa />}

          <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cartao valor={String(contagem.revisao)} rotulo="Em revisão" />
            <Cartao
              valor={String(contagem.divergente)}
              rotulo="Com divergência"
              alerta={contagem.divergente > 0}
            />
            <Cartao valor={String(contagem.aprovada)} rotulo="Aprovadas" />
            <Cartao
              valor={usd(painel.gastoHojeUsd)}
              rotulo={`Gasto hoje · teto ${usd(getConfig().DAILY_BUDGET_USD)}`}
            />
          </section>

          <ZonaEnvio />

          <section
            aria-label="Notas recentes"
            className="overflow-hidden rounded-painel bg-superficie shadow-cartao"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-linha px-5 py-3.5">
              <h2 className="text-[15px] font-semibold">Recentes</h2>
              <nav aria-label="Filtro" className="ml-auto flex rounded-[9px] bg-[#efeff2] p-0.5">
                <Segmento filtro="todas" atual={filtro} rotulo="Todas" />
                <Segmento filtro="revisao" atual={filtro} rotulo="Em revisão" />
                <Segmento filtro="aprovada" atual={filtro} rotulo="Aprovadas" />
              </nav>
            </div>
            {linhas.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-secundario">
                {filtro === "todas"
                  ? "Nenhuma nota ainda. Envie um arquivo ou use uma nota de exemplo."
                  : "Nenhuma nota nesta situação."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-secundario">
                      <th scope="col" className="px-5 py-2.5 font-medium">
                        Arquivo
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Emitente (CNPJ)
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Emissão
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Total
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Situação
                      </th>
                      <th scope="col" className="px-5 py-2.5">
                        <span className="sr-only">Ação</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.id} className="border-t border-linha">
                        <td className="max-w-56 truncate px-5 py-3 font-medium">{l.nomeArquivo}</td>
                        <td className="px-3 py-3 text-tinta-2 tabular-nums">
                          {l.nota ? formatarCnpj(l.nota.cnpjEmitente) : "—"}
                        </td>
                        <td className="px-3 py-3 text-tinta-2 tabular-nums">
                          {l.nota ? isoParaBr(l.nota.dataEmissao) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                          {l.nota ? formatarReais(l.nota.valorTotal) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <Pilula situacao={l.situacao} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/notas/${l.id}`}
                            className="text-[13px] font-medium text-link hover:underline"
                          >
                            {rotuloAcao(l.situacao)}
                            <span className="sr-only"> {l.nomeArquivo}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </EnvioProvider>
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-60 bg-lateral md:block" />
      <div className="flex flex-1 animate-pulsa flex-col gap-6 px-10 py-8">
        <div className="h-8 w-40 rounded bg-black/[0.06]" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-cartao bg-superficie shadow-cartao" />
          ))}
        </div>
        <div className="h-64 rounded-painel bg-superficie shadow-cartao" />
      </div>
    </div>
  );
}

export default function Pagina({ searchParams }: Readonly<PageProps<"/">>) {
  return (
    <Suspense fallback={<Carregando />}>
      <Painel searchParams={searchParams} />
    </Suspense>
  );
}
