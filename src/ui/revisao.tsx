"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { cnpjValido } from "@/nf/domain/cnpj";
import type { Nota } from "@/nf/domain/nota";
import { validarNota } from "@/nf/domain/validacao";
import { IconeAlerta, IconeCheck, IconeLixo, IconeVoltar } from "./icones";
import { obterPreview } from "./previews";
import {
  ITEM_VAZIO,
  type ItemRascunho,
  notaParaRascunho,
  type Rascunho,
  rascunhoParaNota,
} from "./rascunho";
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

type CampoCabecalho = "cnpj" | "data" | "total" | "desconto" | "frete";
type Aviso = { tipo: "erro" | "ok"; texto: string } | null;

const campoBase =
  "h-[38px] w-full min-w-0 rounded-campo bg-campo px-3 text-sm text-tinta tabular-nums outline-offset-2";
const celulaBase =
  "w-full min-w-0 rounded-md bg-transparent px-1 py-1 tabular-nums hover:bg-campo focus:bg-campo";

// Itens não têm id próprio; a chave estável evita que o React reaproveite o input errado ao remover.
let proximaChave = 0;
const novaChave = () => `item-${++proximaChave}`;

function analisar(rascunho: Rascunho, hoje: string) {
  const { nota, formato } = rascunhoParaNota(rascunho);
  const sinalizacoes = nota ? validarNota(nota, hoje) : [];
  return {
    notaAtual: nota,
    problemas: [...formato, ...sinalizacoes.map((s) => s.mensagem)],
    itensComAlerta: new Set(sinalizacoes.flatMap((s) => (s.item === undefined ? [] : [s.item]))),
  };
}

function textoRodape(aprovada: boolean, temProblemas: boolean) {
  if (aprovada) return "Nota aprovada.";
  return temProblemas ? "Corrija os alertas para aprovar" : "Tudo confere.";
}

function FilaLateral({ fila, atual }: Readonly<{ fila: ItemFila[]; atual: string }>) {
  return (
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
          aria-current={f.id === atual ? "page" : undefined}
          className={`flex flex-col gap-0.5 rounded-lg px-2.5 py-2 ${
            f.id === atual ? "bg-black/[0.07]" : "hover:bg-black/[0.04]"
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
  );
}

function Campo(
  props: Readonly<{
    id: string;
    rotulo: string;
    valor: string;
    onChange: (v: string) => void;
    disabled: boolean;
    className?: string;
    numerico?: boolean;
    placeholder?: string;
    extra?: ReactNode;
  }>,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-xs font-medium text-secundario">
        {props.rotulo}
      </label>
      <div className="relative">
        <input
          id={props.id}
          value={props.valor}
          onChange={(e) => props.onChange(e.target.value)}
          disabled={props.disabled}
          inputMode={props.numerico ? "decimal" : undefined}
          placeholder={props.placeholder}
          className={`${campoBase} ${props.className ?? ""}`}
        />
        {props.extra}
      </div>
    </div>
  );
}

function SeloCnpj({ cnpj }: Readonly<{ cnpj: string }>) {
  const valido = cnpjValido(cnpj);
  return (
    <span
      className={`absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs ${
        valido ? "text-ok" : "text-alerta"
      }`}
    >
      {valido && <IconeCheck tamanho={13} strokeWidth={2.4} />}
      {valido ? "DV confere" : "DV não confere"}
    </span>
  );
}

function LinhaItem(
  props: Readonly<{
    item: ItemRascunho;
    numero: number;
    alerta: boolean;
    somenteLeitura: boolean;
    onMudar: (parcial: Partial<ItemRascunho>) => void;
    onRemover: () => void;
  }>,
) {
  const { item, numero, alerta, somenteLeitura, onMudar } = props;
  const celula = (
    rotulo: string,
    campo: keyof ItemRascunho,
    classe: string,
    extra: Record<string, unknown> = {},
  ) => (
    <input
      aria-label={`${rotulo} do item ${numero}`}
      value={item[campo]}
      onChange={(e) => onMudar({ [campo]: e.target.value })}
      disabled={somenteLeitura}
      className={`${celulaBase} ${classe}`}
      {...extra}
    />
  );
  const classeTotal = alerta
    ? "text-right font-semibold text-alerta shadow-[inset_0_-2px_0_var(--color-alerta)]"
    : "text-right font-medium";

  return (
    <tr className={`border-t border-linha ${alerta ? "bg-alerta-suave" : ""}`}>
      <td className="px-1.5 py-1">{celula("Descrição", "descricao", "")}</td>
      <td className="px-1 py-1">
        {celula("Quantidade", "quantidade", "text-right", { inputMode: "decimal" })}
      </td>
      <td className="px-1 py-1">
        {celula("Valor unitário", "valorUnitario", "text-right", { inputMode: "decimal" })}
      </td>
      <td className="px-1.5 py-1">
        {celula("Total", "valorTotal", classeTotal, {
          inputMode: "decimal",
          "aria-invalid": alerta || undefined,
        })}
      </td>
      {!somenteLeitura && (
        <td className="pr-1.5">
          <button
            type="button"
            aria-label={`Remover item ${numero}`}
            onClick={props.onRemover}
            className="flex size-7 items-center justify-center rounded-md text-secundario hover:bg-black/[0.05] hover:text-alerta"
          >
            <IconeLixo tamanho={14} />
          </button>
        </td>
      )}
    </tr>
  );
}

function FalhaExtracao({ erro }: Readonly<{ erro: string | null }>) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <div role="alert" className="flex gap-2.5 rounded-xl bg-alerta-suave px-3.5 py-3">
        <IconeAlerta tamanho={18} className="mt-px shrink-0 text-alerta" />
        <p className="text-[13px] leading-relaxed text-alerta-texto">
          <b>Não foi possível extrair esta nota.</b> {erro ?? "Tente enviar o arquivo de novo."}
        </p>
      </div>
      <Link href="/" className="text-sm font-medium text-link">
        Voltar e enviar outro arquivo
      </Link>
    </div>
  );
}

function Editor(
  props: Readonly<{
    documentoId: string;
    inicial: Rascunho;
    hoje: string;
    aprovada: boolean;
    onProblemas: (n: number) => void;
  }>,
) {
  const { documentoId, hoje, aprovada } = props;
  const router = useRouter();
  const [rascunho, setRascunho] = useState(props.inicial);
  const [chaves, setChaves] = useState(() => props.inicial.itens.map(novaChave));
  const [enviando, setEnviando] = useState<"salvar" | "aprovar" | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const { notaAtual, problemas, itensComAlerta } = useMemo(
    () => analisar(rascunho, hoje),
    [rascunho, hoje],
  );

  function atualizar(novo: Rascunho) {
    setRascunho(novo);
    setAviso(null);
    props.onProblemas(analisar(novo, hoje).problemas.length);
  }
  const mudar = (campo: CampoCabecalho) => (valor: string) =>
    atualizar({ ...rascunho, [campo]: valor });
  const mudarItem = (k: number, parcial: Partial<ItemRascunho>) =>
    atualizar({
      ...rascunho,
      itens: rascunho.itens.map((i, j) => (j === k ? { ...i, ...parcial } : i)),
    });
  function adicionarItem() {
    setChaves([...chaves, novaChave()]);
    atualizar({ ...rascunho, itens: [...rascunho.itens, { ...ITEM_VAZIO }] });
  }
  function removerItem(k: number) {
    setChaves(chaves.filter((_, j) => j !== k));
    atualizar({ ...rascunho, itens: rascunho.itens.filter((_, j) => j !== k) });
  }

  async function gravar(aprovar: boolean) {
    if (!notaAtual) return;
    setEnviando(aprovar ? "aprovar" : "salvar");
    try {
      const r = await fetch(`/api/notas/${documentoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: notaAtual, aprovar }),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo?.erro?.mensagem ?? "Não foi possível salvar.");
      if (aprovar) router.push("/");
      else setAviso({ tipo: "ok", texto: "Correções salvas." });
      router.refresh();
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
          <div className="col-span-2">
            <Campo
              id="cnpj"
              rotulo="CNPJ do emitente"
              valor={rascunho.cnpj}
              onChange={mudar("cnpj")}
              disabled={aprovada}
              className="pr-28"
              extra={<SeloCnpj cnpj={rascunho.cnpj} />}
            />
          </div>
          <Campo
            id="data"
            rotulo="Data de emissão"
            valor={rascunho.data}
            onChange={mudar("data")}
            disabled={aprovada}
            placeholder="dd/mm/aaaa"
          />
          <Campo
            id="total"
            rotulo="Valor total (R$)"
            valor={rascunho.total}
            onChange={mudar("total")}
            disabled={aprovada}
            numerico
            className="text-right font-semibold"
          />
          <Campo
            id="desconto"
            rotulo="Desconto (R$)"
            valor={rascunho.desconto}
            onChange={mudar("desconto")}
            disabled={aprovada}
            numerico
            className="text-right"
          />
          <Campo
            id="frete"
            rotulo="Frete e acréscimos (R$)"
            valor={rascunho.frete}
            onChange={mudar("frete")}
            disabled={aprovada}
            numerico
            className="text-right"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <h2 className="text-sm font-semibold">Itens ({rascunho.itens.length})</h2>
            {!aprovada && (
              <button
                type="button"
                onClick={adicionarItem}
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
                {rascunho.itens.map((item, k) => (
                  <LinhaItem
                    key={chaves[k] ?? k}
                    item={item}
                    numero={k + 1}
                    alerta={itensComAlerta.has(k)}
                    somenteLeitura={aprovada}
                    onMudar={(parcial) => mudarItem(k, parcial)}
                    onRemover={() => removerItem(k)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-linha px-5 py-3.5">
        {aviso?.tipo === "erro" && (
          <span role="alert" className="text-xs text-alerta">
            {aviso.texto}
          </span>
        )}
        {aviso?.tipo === "ok" && <output className="text-xs text-ok">{aviso.texto}</output>}
        {!aviso && (
          <span className="text-xs text-secundario">
            {textoRodape(aprovada, problemas.length > 0)}
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
  );
}

function SeloAlertas({ quantidade }: Readonly<{ quantidade: number }>) {
  if (quantidade === 0) {
    return (
      <span className="inline-flex h-[22px] items-center rounded-full bg-ok-fundo px-2.5 text-xs font-medium text-ok">
        Sem alertas
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] items-center rounded-full bg-alerta-fundo px-2.5 text-xs font-medium text-alerta">
      {quantidade} {quantidade === 1 ? "alerta" : "alertas"}
    </span>
  );
}

export function Revisao({ documento, nota, hoje, fila }: Readonly<Props>) {
  const [inicial] = useState(() => (nota ? notaParaRascunho(nota) : null));
  const [qtdProblemas, setQtdProblemas] = useState(() =>
    inicial ? analisar(inicial, hoje).problemas.length : 0,
  );
  const [preview] = useState(() =>
    obterPreview(documento.id, documento.nomeArquivo, documento.mime),
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <FilaLateral fila={fila} atual={documento.id} />

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
          {inicial && <SeloAlertas quantidade={qtdProblemas} />}
          {documento.modelo && (
            <span className="ml-auto text-xs text-secundario">{documento.modelo}</span>
          )}
        </div>
        {inicial ? (
          <Editor
            documentoId={documento.id}
            inicial={inicial}
            hoje={hoje}
            aprovada={documento.status === "aprovada"}
            onProblemas={setQtdProblemas}
          />
        ) : (
          <FalhaExtracao erro={documento.erro} />
        )}
      </aside>
    </div>
  );
}
