import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { tamanho?: number };

function Icone({ tamanho = 16, children, ...resto }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...resto}
    >
      {children}
    </svg>
  );
}

export const IconeDocumento = (p: Props) => (
  <Icone {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </Icone>
);
export const IconeLista = (p: Props) => (
  <Icone {...p}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </Icone>
);
export const IconeRelogio = (p: Props) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </Icone>
);
export const IconeCheck = (p: Props) => (
  <Icone {...p}>
    <path d="M5 12l4 4 10-10" />
  </Icone>
);
export const IconeBaixar = (p: Props) => (
  <Icone strokeWidth={2.2} {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icone>
);
export const IconeEnviar = (p: Props) => (
  <Icone {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
  </Icone>
);
export const IconeVoltar = (p: Props) => (
  <Icone strokeWidth={2} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icone>
);
export const IconeAlerta = (p: Props) => (
  <Icone strokeWidth={2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </Icone>
);
export const IconeVarrer = (p: Props) => (
  <Icone strokeWidth={2} {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
  </Icone>
);
export const IconeLixo = (p: Props) => (
  <Icone {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Icone>
);
