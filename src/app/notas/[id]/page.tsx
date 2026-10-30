import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { NotaNaoEncontrada } from "@/nf/application/erros";
import { buscarParaRevisao, montarPainel } from "@/nf/application/notas";
import { hojeEmBrasilia } from "@/nf/domain/datas";
import { formatarReais } from "@/nf/domain/dinheiro";
import { repositorio } from "@/nf/infra/container";
import { type ItemFila, Revisao } from "@/ui/revisao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resumoAlertas(quantidade: number) {
  if (quantidade === 0) return "sem alertas";
  return `${quantidade} ${quantidade === 1 ? "alerta" : "alertas"}`;
}

async function Conteudo({ params }: Readonly<{ params: PageProps<"/notas/[id]">["params"] }>) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const repo = repositorio();
  const agora = new Date();
  const hoje = hojeEmBrasilia(agora);
  let documento;
  try {
    documento = await buscarParaRevisao(repo, id);
  } catch (err) {
    if (err instanceof NotaNaoEncontrada) notFound();
    throw err;
  }

  const painel = await montarPainel(repo, agora, hoje);
  const fila: ItemFila[] = painel.linhas
    .filter((l) => l.situacao === "revisao" || l.situacao === "divergente" || l.id === id)
    .map((l) => ({
      id: l.id,
      nome: l.nomeArquivo,
      alerta: l.sinalizacoes.length > 0 || l.situacao === "falhou",
      detalhe: l.nota
        ? `${formatarReais(l.nota.valorTotal)} · ${resumoAlertas(l.sinalizacoes.length)}`
        : "não extraída",
    }));

  return (
    <Revisao
      key={documento.id}
      documento={{
        id: documento.id,
        nomeArquivo: documento.nomeArquivo,
        mime: documento.mime,
        status: documento.status,
        erro: documento.erro,
        modelo: documento.modelo,
      }}
      nota={documento.nota}
      hoje={hoje}
      fila={fila}
    />
  );
}

export default function Pagina({ params }: Readonly<PageProps<"/notas/[id]">>) {
  return (
    <Suspense
      fallback={<div className="min-h-dvh animate-pulsa bg-fundo" aria-label="Carregando nota" />}
    >
      <Conteudo params={params} />
    </Suspense>
  );
}
