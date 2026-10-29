"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cnpjValido } from "@/nf/domain/cnpj";
import type { Nota } from "@/nf/domain/nota";
import { validarNota } from "@/nf/domain/validacao";
import { IconeAlerta, IconeCheck, IconeLixo, IconeVoltar } from "./icones";
import { obterPreview } from "./previews";
import { ITEM_VAZIO, type ItemRascunho, notaParaRascunho, rascunhoParaNota } from "./rascunho";
import { Visualizador } from "./visualizador";

export interface ItemFila {
  id: string;
  nome: string;
  detalhe: string;
  alerta: boolean;
}

interface Props {
  documento: {
    id: string;
    nomeArquivo: string;
    mime: string;
    status: string;
    erro: string | null;
    modelo: string | null;
  };
  nota: Nota | null;
  hoje: string;
  fila: ItemFila[];
}

const campo =
  "h-[38px] w-full min-w-0 rounded-campo bg-campo px-3 text-sm text-tinta tabular-nums outline-offset-2";
const rotulo = "text-xs font-medium text-secundario";

export function Revisao({ documento, nota, hoje, fila }: Props) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState(() => (nota ? notaParaRascunho(nota) : null));
  const [enviando, setEnviando] = useState<"salvar" | "aprovar" | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [preview] = useState(() =>
    obterPreview(documento.id, documento.nomeArquivo, documento.mime),
  );

  const { notaAtual, problemas, itemComAlerta } = useMemo(() => {
    if (!rascunho) return { notaAtual: null, problemas: [], itemComAlerta: new Set<number>() };
    const { nota: n, formato } = rascunhoParaNota(rascunho);
    const sinalizacoes = n ? validarNota(n, hoje) : [];
    return {
      notaAtual: n,
      problemas: [...formato, ...sinalizacoes.map((s) => s.mensagem)],
      itemComAlerta: new Set(sinalizacoes.flatMap((s) => (s.item === undefined ? [] : [s.item]))),
    };
  }, [rascunho, hoje]);

  const aprovada = documento.status === "aprovada";

  function mudar(campoNome: "cnpj" | "data" | "total" | "desconto" | "frete", valor: string) {
    setRascunho((r) => r && { ...r, [campoNome]: valor });
    setAviso(null);
  }
  function mudarItem(k: number, parcial: Partial<ItemRascunho>) {
    setRascunho(
      (r) => r && { ...r, itens: r.itens.map((i, j) => (j === k ? { ...i, ...parcial } : i)) },
    );
    setAviso(null);
  }

  async function gravar(aprovar: boolean) {
    if (!notaAtual) return;
    setEnviando(aprovar ? "aprovar" : "salvar");
    try {
      const r = await fetch(`/api/notas/${documento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: notaAtual, aprovar }),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo?.erro?.mensagem ?? "Não foi possível salvar.");
      if (aprovar) {
        router.push("/");
        router.refresh();
      } else {
        setAviso({ tipo: "ok", texto: "Correções salvas." });
        router.refresh();
      }
    } catch (e) {
      setAviso({
        tipo: "erro",
        texto: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <nav
        aria-label="Notas em revisão"
        className="flex w-full flex-col gap-0.5 border-b border-black/[0.08] bg-lateral px-2.5 py-4 lg:min-h-dvh lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 xl:w-60"
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 px-2.5 pb-3.5 text-[13px] font-medium text-link"
        >
          <IconeVoltar tamanho={14} /> Todas as notas
        </Link>
        <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-secundario uppercase">
          Em revisão
        </span>
        {fila.length === 0 && (
          <span className="px-2.5 text-xs text-secundario">Nenhuma outra nota pendente.</span>
        )}
        {fila.map((f) => (
          <Link
            key={f.id}
            href={`/notas/${f.id}`}
            aria-current={f.id === documento.id ? "page" : undefined}
            className={`flex flex-col gap-0.5 rounded-lg px-2.5 py-2 ${
              f.id === documento.id ? "bg-black/[0.07]" : "hover:bg-black/[0.04]"
            }`}
          >
            <span className="flex items-center gap-2 truncate text-[13px] font-medium text-tinta">
              <span
                aria-hidden="true"
                className={`size-[7px] shrink-0 rounded-full ${f.alerta ? "bg-alerta" : "bg-[#2e9e52]"}`}
              />
              {f.nome}
            </span>
            <span className="pl-[15px] text-xs text-secundario">{f.detalhe}</span>
          </Link>
        ))}
      </nav>

      <section
        aria-label="Documento"
        className="flex min-h-[480px] min-w-0 flex-1 flex-col border-r border-black/[0.08]"
      >
        <div className="flex items-center gap-2.5 border-b border-linha bg-white/70 px-5 py-3">
          <span className="truncate text-sm font-semibold">{documento.nomeArquivo}</span>
          <span className="text-xs text-secundario">
            {documento.mime === "application/pdf" ? "PDF" : "foto"}
          </span>
        </div>
        <Visualizador preview={preview} />
      </section>

      <aside
        aria-label="Dados extraídos"
        className="flex w-full shrink-0 flex-col bg-superficie lg:w-[400px] xl:w-[460px]"
      >
        <div className="flex items-center gap-2 border-b border-linha px-5 py-4">
          <h1 className="text-[17px] font-semibold tracking-tight">Dados extraídos</h1>
          {rascunho &&
            (problemas.length > 0 ? (
              <span className="inline-flex h-[22px] items-center rounded-full bg-alerta-fundo px-2.5 text-xs font-medium text-alerta">
                {problemas.length} {problemas.length === 1 ? "alerta" : "alertas"}
              </span>
            ) : (
              <span className="inline-flex h-[22px] items-center rounded-full bg-ok-fundo px-2.5 text-xs font-medium text-ok">
                Sem alertas
              </span>
            ))}
          {documento.modelo && (
            <span className="ml-auto text-xs text-secundario">{documento.modelo}</span>
          )}
        </div>

        {!rascunho ? (
          <div className="flex flex-col gap-3 p-5">
            <div role="alert" className="flex gap-2.5 rounded-xl bg-alerta-suave px-3.5 py-3">
              <IconeAlerta tamanho={18} className="mt-px shrink-0 text-alerta" />
              <p className="text-[13px] leading-relaxed text-alerta-texto">
                <b>Não foi possível extrair esta nota.</b>{" "}
                {documento.erro ?? "Tente enviar o arquivo de novo."}
              </p>
            </div>
            <Link href="/" className="text-sm font-medium text-link">
              Voltar e enviar outro arquivo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 overflow-auto px-5 py-4">
              {problemas.length > 0 && (
                <div role="alert" className="flex gap-2.5 rounded-xl bg-alerta-suave px-3.5 py-3">
                  <IconeAlerta tamanho={18} className="mt-px shrink-0 text-alerta" />
                  <ul className="flex flex-col gap-1 text-[13px] leading-relaxed text-alerta-texto">
                    {problemas.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="cnpj" className={rotulo}>
                    CNPJ do emitente
                  </label>
                  <div className="relative">
                    <input
                      id="cnpj"
                      value={rascunho.cnpj}
                      onChange={(e) => mudar("cnpj", e.target.value)}
                      disabled={aprovada}
                      className={`${campo} pr-28`}
                    />
                    <span
                      className={`absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs ${
                        cnpjValido(rascunho.cnpj) ? "text-ok" : "text-alerta"
                      }`}
                    >
                      {cnpjValido(rascunho.cnpj) ? (
                        <>
                          <IconeCheck tamanho={13} strokeWidth={2.4} /> DV confere
                        </>
                      ) : (
                        "DV não confere"
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="data" className={rotulo}>
                    Data de emissão
                  </label>
                  <input
                    id="data"
                    value={rascunho.data}
                    onChange={(e) => mudar("data", e.target.value)}
                    disabled={aprovada}
                    placeholder="dd/mm/aaaa"
                    className={campo}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="total" className={rotulo}>
                    Valor total (R$)
                  </label>
                  <input
                    id="total"
                    value={rascunho.total}
                    onChange={(e) => mudar("total", e.target.value)}
                    disabled={aprovada}
                    inputMode="decimal"
                    className={`${campo} text-right font-semibold`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="desconto" className={rotulo}>
                    Desconto (R$)
                  </label>
                  <input
                    id="desconto"
                    value={rascunho.desconto}
                    onChange={(e) => mudar("desconto", e.target.value)}
                    disabled={aprovada}
                    inputMode="decimal"
                    className={`${campo} text-right`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="frete" className={rotulo}>
                    Frete e acréscimos (R$)
                  </label>
                  <input
                    id="frete"
                    value={rascunho.frete}
                    onChange={(e) => mudar("frete", e.target.value)}
                    disabled={aprovada}
                    inputMode="decimal"
                    className={`${campo} text-right`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <h2 className="text-sm font-semibold">Itens ({rascunho.itens.length})</h2>
                  {!aprovada && (
                    <button
                      type="button"
                      onClick={() =>
                        setRascunho((r) => r && { ...r, itens: [...r.itens, { ...ITEM_VAZIO }] })
                      }
                      className="ml-auto h-7 rounded-lg px-2.5 text-[13px] font-medium text-link hover:bg-black/[0.04]"
                    >
                      + Adicionar item
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl shadow-[0_0_0_1px_rgb(0_0_0/0.07)]">
                  <table className="w-full min-w-[340px] border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#fafafb] text-left text-[11px] text-secundario">
                        <th scope="col" className="px-2.5 py-2 font-medium">
                          Descrição
                        </th>
                        <th scope="col" className="w-16 px-1.5 py-2 text-right font-medium">
                          Qtd
                        </th>
                        <th scope="col" className="w-20 px-1.5 py-2 text-right font-medium">
                          Unit.
                        </th>
                        <th scope="col" className="w-24 px-2.5 py-2 text-right font-medium">
                          Total
                        </th>
                        {!aprovada && (
                          <th scope="col" className="w-8">
                            <span className="sr-only">Remover</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rascunho.itens.map((item, k) => {
                        const alerta = itemComAlerta.has(k);
                        const celula =
                          "w-full min-w-0 rounded-md bg-transparent px-1 py-1 tabular-nums hover:bg-campo focus:bg-campo";
                        return (
                          <tr
                            key={k}
                            className={`border-t border-linha ${alerta ? "bg-alerta-suave" : ""}`}
                          >
                            <td className="px-1.5 py-1">
                              <input
                                aria-label={`Descrição do item ${k + 1}`}
                                value={item.descricao}
                                onChange={(e) => mudarItem(k, { descricao: e.target.value })}
                                disabled={aprovada}
                                className={celula}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                aria-label={`Quantidade do item ${k + 1}`}
                                value={item.quantidade}
                                onChange={(e) => mudarItem(k, { quantidade: e.target.value })}
                                disabled={aprovada}
                                inputMode="decimal"
                                className={`${celula} text-right`}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                aria-label={`Valor unitário do item ${k + 1}`}
                                value={item.valorUnitario}
                                onChange={(e) => mudarItem(k, { valorUnitario: e.target.value })}
                                disabled={aprovada}
                                inputMode="decimal"
                                className={`${celula} text-right`}
                              />
                            </td>
                            <td className="px-1.5 py-1">
                              <input
                                aria-label={`Total do item ${k + 1}`}
                                aria-invalid={alerta || undefined}
                                value={item.valorTotal}
                                onChange={(e) => mudarItem(k, { valorTotal: e.target.value })}
                                disabled={aprovada}
                                inputMode="decimal"
                                className={`${celula} text-right ${
                                  alerta
                                    ? "font-semibold text-alerta shadow-[inset_0_-2px_0_var(--color-alerta)]"
                                    : "font-medium"
                                }`}
                              />
                            </td>
                            {!aprovada && (
                              <td className="pr-1.5">
                                <button
                                  type="button"
                                  aria-label={`Remover item ${k + 1}`}
                                  onClick={() =>
                                    setRascunho(
                                      (r) =>
                                        r && { ...r, itens: r.itens.filter((_, j) => j !== k) },
                                    )
                                  }
                                  className="flex size-7 items-center justify-center rounded-md text-secundario hover:bg-black/[0.05] hover:text-alerta"
                                >
                                  <IconeLixo tamanho={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-linha px-5 py-3.5">
              {aviso ? (
                <span
                  role={aviso.tipo === "erro" ? "alert" : "status"}
                  className={`text-xs ${aviso.tipo === "erro" ? "text-alerta" : "text-ok"}`}
                >
                  {aviso.texto}
                </span>
              ) : (
                <span className="text-xs text-secundario">
                  {aprovada
                    ? "Nota aprovada."
                    : problemas.length > 0
                      ? "Corrija os alertas para aprovar"
                      : "Tudo confere."}
                </span>
              )}
              {!aprovada && (
                <>
                  <button
                    type="button"
                    onClick={() => gravar(false)}
                    disabled={!notaAtual || enviando !== null}
                    className="ml-auto h-9 rounded-full border border-black/[0.12] bg-superficie px-3.5 text-sm text-tinta hover:bg-black/[0.03] disabled:opacity-40"
                  >
                    {enviando === "salvar" ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => gravar(true)}
                    disabled={problemas.length > 0 || enviando !== null}
                    className="h-9 rounded-full bg-acao px-4 text-sm font-medium text-white hover:bg-acao-escura disabled:opacity-40"
                  >
                    {enviando === "aprovar" ? "Aprovando…" : "Aprovar"}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
