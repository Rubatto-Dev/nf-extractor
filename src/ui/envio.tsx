"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useState } from "react";
import { IconeEnviar, IconeVarrer, IconeVoltar } from "./icones";
import { guardarPreview, type Preview } from "./previews";
import { reduzirImagem } from "./reduzir-imagem";
import { Visualizador } from "./visualizador";

const ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 4 * 1024 * 1024;
const AMOSTRAS = [
  { nome: "amostra-danfe.pdf", tipo: "application/pdf" },
  { nome: "amostra-danfe-foto.jpg", tipo: "image/jpeg" },
  { nome: "amostra-cupom.jpg", tipo: "image/jpeg" },
];

interface EmAndamento {
  nome: string;
  descricao: string;
  preview: Preview;
}

interface Envio {
  enviar: (arquivo: File) => Promise<void>;
  enviarExemplo: () => Promise<void>;
  erro: string | null;
}

const EnvioContexto = createContext<Envio | null>(null);

function useEnvio(): Envio {
  const ctx = use(EnvioContexto);
  if (!ctx) throw new Error("useEnvio fora do EnvioProvider");
  return ctx;
}

function descrever(arquivo: File) {
  const tipo = arquivo.type === "application/pdf" ? "PDF" : "foto";
  const kb = Math.max(1, Math.round(arquivo.size / 1024));
  return `${tipo} · ${kb} KB`;
}

export function EnvioProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [andamento, setAndamento] = useState<EmAndamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(original: File) {
    setErro(null);
    if (!ACEITOS.includes(original.type)) {
      setErro("Formato não aceito. Use PDF, JPEG, PNG ou WebP.");
      return;
    }
    const arquivo = await reduzirImagem(original);
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro("O arquivo passa de 4 MB.");
      return;
    }
    const preview = { url: URL.createObjectURL(arquivo), mime: arquivo.type };
    setAndamento({ nome: arquivo.name, descricao: descrever(arquivo), preview });

    const form = new FormData();
    form.append("arquivo", arquivo);
    try {
      const resposta = await fetch("/api/notas", { method: "POST", body: form });
      const corpo = await resposta.json();
      if (!resposta.ok)
        throw new Error(corpo?.erro?.mensagem ?? "Não foi possível extrair a nota.");
      guardarPreview(corpo.documentoId, preview);
      router.push(`/notas/${corpo.documentoId}`);
    } catch (e) {
      setAndamento(null);
      setErro(e instanceof Error ? e.message : "Não foi possível extrair a nota.");
      router.refresh();
    }
  }

  async function enviarExemplo() {
    const amostra = AMOSTRAS[Math.floor(Math.random() * AMOSTRAS.length)] ?? AMOSTRAS[0]!;
    const blob = await (await fetch(`/amostras/${amostra.nome}`)).blob();
    await enviar(new File([blob], amostra.nome, { type: amostra.tipo }));
  }

  return (
    <EnvioContexto value={{ enviar, enviarExemplo, erro }}>
      {children}
      {andamento && <Extraindo {...andamento} />}
    </EnvioContexto>
  );
}

export function BotaoExemplo() {
  const { enviarExemplo } = useEnvio();
  return (
    <button
      type="button"
      onClick={enviarExemplo}
      className="h-9 rounded-full border border-black/[0.12] bg-superficie px-3.5 text-sm text-tinta hover:bg-black/[0.03]"
    >
      Usar nota de exemplo
    </button>
  );
}

export function ZonaEnvio() {
  const { enviar, erro } = useEnvio();
  const [arrastando, setArrastando] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="arquivo"
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const arquivo = e.dataTransfer.files[0];
          if (arquivo) void enviar(arquivo);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-painel border-[1.5px] border-dashed px-6 py-8 text-center transition-colors ${
          arrastando ? "border-acao bg-info-fundo" : "border-black/[0.18] bg-superficie"
        }`}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-[#f0f5ff] text-acao">
          <IconeEnviar tamanho={22} />
        </span>
        <span className="text-[15px] font-semibold">
          Arraste a nota aqui ou <span className="text-link">escolha um arquivo</span>
        </span>
        <span className="text-[13px] text-secundario">
          PDF, JPEG, PNG ou WebP, até 4 MB · fotos são reduzidas no navegador antes do envio
        </span>
        <input
          id="arquivo"
          type="file"
          accept={ACEITOS.join(",")}
          className="sr-only"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void enviar(arquivo);
            e.target.value = "";
          }}
        />
      </label>
      {erro && (
        <p
          role="alert"
          className="rounded-xl bg-alerta-suave px-3.5 py-2.5 text-sm text-alerta-texto"
        >
          {erro}
        </p>
      )}
    </div>
  );
}

function Esqueleto({ className }: { className: string }) {
  return <div className={`rounded ${className}`} />;
}

function Extraindo({ nome, descricao, preview }: EmAndamento) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Extraindo a nota"
      className="fixed inset-0 z-50 flex flex-col overflow-auto bg-fundo md:flex-row"
    >
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-black/[0.08] bg-lateral px-2.5 py-4 md:flex">
        <span className="flex items-center gap-1.5 px-2.5 pb-3.5 text-[13px] font-medium text-link">
          <IconeVoltar tamanho={14} /> Todas as notas
        </span>
        <div className="flex flex-col gap-0.5 rounded-lg bg-black/[0.07] px-2.5 py-2">
          <span className="flex items-center gap-2 truncate text-[13px] font-medium">
            <span className="size-[7px] shrink-0 rounded-full bg-acao" aria-hidden="true" />
            {nome}
          </span>
          <span className="pl-[15px] text-xs text-secundario">Extraindo…</span>
        </div>
      </aside>

      <section
        aria-label="Documento"
        className="flex min-w-0 flex-1 flex-col border-r border-black/[0.08]"
      >
        <div className="flex items-center gap-2.5 border-b border-linha bg-white/70 px-5 py-3">
          <span className="truncate text-sm font-semibold">{nome}</span>
          <span className="text-xs text-secundario">{descricao}</span>
          <span className="ml-auto inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full bg-info-fundo px-3 text-xs font-medium text-info">
            <IconeVarrer tamanho={13} /> Lendo a nota
          </span>
        </div>
        <Visualizador preview={preview}>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 h-24 animate-varre border-b-2 border-acao bg-gradient-to-b from-acao/0 via-acao/15 to-acao/50"
          />
        </Visualizador>
      </section>

      <aside
        aria-label="Dados extraídos"
        aria-busy="true"
        className="flex w-full shrink-0 flex-col bg-superficie md:w-[440px]"
      >
        <div className="flex items-center gap-2 border-b border-linha px-5 py-4">
          <h2 className="text-[17px] font-semibold tracking-tight">Dados extraídos</h2>
          <span className="ml-auto text-xs text-secundario">costuma levar 5 a 10 s</span>
        </div>
        <div className="flex animate-pulsa flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Esqueleto className="h-2.5 w-28 bg-[#ededf0]" />
            <Esqueleto className="h-[38px] rounded-campo bg-campo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Esqueleto className="h-[38px] rounded-campo bg-campo" />
            <Esqueleto className="h-[38px] rounded-campo bg-campo" />
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-3 shadow-cartao">
            <Esqueleto className="h-3 w-[96%] bg-[#ededf0]" />
            <Esqueleto className="h-3 w-[88%] bg-[#ededf0]" />
            <Esqueleto className="h-3 w-[92%] bg-[#ededf0]" />
            <Esqueleto className="h-3 w-[80%] bg-[#ededf0]" />
          </div>
        </div>
        <p className="mx-5 text-[13px] leading-relaxed text-secundario">
          O Claude está lendo CNPJ, data, total e itens. Depois as regras conferem dígito do CNPJ,
          soma dos itens e data.
        </p>
      </aside>
    </div>
  );
}
