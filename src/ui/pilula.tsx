import type { Situacao } from "@/nf/application/notas";

const ESTILO: Record<Situacao, { classe: string; texto: string }> = {
  extraindo: { classe: "bg-info-fundo text-info", texto: "Extraindo" },
  revisao: { classe: "bg-revisao-fundo text-revisao", texto: "Em revisão" },
  divergente: { classe: "bg-alerta-fundo text-alerta", texto: "Com divergência" },
  aprovada: { classe: "bg-ok-fundo text-ok", texto: "Aprovada" },
  falhou: { classe: "bg-neutro-fundo text-neutro", texto: "Falhou" },
};

export function Pilula({ situacao }: Readonly<{ situacao: Situacao }>) {
  const { classe, texto } = ESTILO[situacao];
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${classe}`}
    >
      {texto}
    </span>
  );
}
