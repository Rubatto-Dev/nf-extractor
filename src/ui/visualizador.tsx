"use client";

import type { ReactNode } from "react";
import type { Preview } from "./previews";

export function Visualizador({
  preview,
  children,
}: Readonly<{ preview?: Preview; children?: ReactNode }>) {
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-palco px-6 py-8">
      <div className="relative w-full max-w-[560px] overflow-hidden bg-[#fcfcfa] shadow-papel">
        {!preview && (
          <div className="flex min-h-80 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-secundario">
            <span className="font-medium text-tinta">Pré-visualização indisponível</span>O arquivo
            não é guardado no servidor. Ele aparece só na aba em que foi enviado.
          </div>
        )}
        {preview?.mime === "application/pdf" && (
          <object
            data={`${preview.url}#toolbar=0&navpanes=0`}
            type="application/pdf"
            aria-label="Nota fiscal em PDF"
            className="block h-[720px] w-full"
          >
            <a href={preview.url} className="block p-8 text-center text-sm text-link">
              Abrir o PDF da nota
            </a>
          </object>
        )}
        {preview && preview.mime !== "application/pdf" && (
          // eslint-disable-next-line @next/next/no-img-element -- blob: local, não passa pelo otimizador
          <img src={preview.url} alt="Foto da nota fiscal" className="block h-auto w-full" />
        )}
        {children}
      </div>
    </div>
  );
}
