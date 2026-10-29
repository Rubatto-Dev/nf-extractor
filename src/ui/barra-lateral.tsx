import Link from "next/link";
import type { ReactNode } from "react";
import { IconeCheck, IconeDocumento, IconeLista, IconeRelogio } from "./icones";

interface Props {
  ativo: "todas" | "revisao" | "aprovada";
  contagem: { todas: number; revisao: number; aprovada: number };
}

function Item(props: {
  href: string;
  ativo: boolean;
  icone: ReactNode;
  rotulo: string;
  total: number;
}) {
  return (
    <Link
      href={props.href}
      aria-current={props.ativo ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-tinta ${
        props.ativo ? "bg-black/[0.07] font-medium" : "hover:bg-black/[0.04]"
      }`}
    >
      {props.icone}
      {props.rotulo}
      <span className="ml-auto text-xs text-secundario">{props.total}</span>
    </Link>
  );
}

export function BarraLateral({ ativo, contagem }: Props) {
  return (
    <nav
      aria-label="Navegação"
      className="flex w-full flex-col gap-1 border-b border-black/[0.08] bg-lateral px-3 py-5 md:min-h-dvh md:w-60 md:border-r md:border-b-0"
    >
      <div className="flex items-center gap-2.5 px-2.5 pb-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-tinta text-white">
          <IconeDocumento tamanho={16} strokeWidth={2} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">nf-extractor</span>
      </div>
      <Item
        href="/"
        ativo={ativo === "todas"}
        icone={<IconeLista />}
        rotulo="Notas"
        total={contagem.todas}
      />
      <Item
        href="/?filtro=revisao"
        ativo={ativo === "revisao"}
        icone={<IconeRelogio />}
        rotulo="Em revisão"
        total={contagem.revisao}
      />
      <Item
        href="/?filtro=aprovada"
        ativo={ativo === "aprovada"}
        icone={<IconeCheck />}
        rotulo="Aprovadas"
        total={contagem.aprovada}
      />
      <p className="mt-auto hidden px-2.5 pt-6 text-xs leading-relaxed text-secundario md:block">
        Demo com notas fictícias.
        <br />O arquivo não é guardado.
      </p>
    </nav>
  );
}
