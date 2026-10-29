"use client";

// O arquivo nunca vai para o servidor depois da extração (LGPD). O preview vive só na memória
// da aba de quem enviou; recarregar a página perde o preview, não os dados.
export interface Preview {
  url: string;
  mime: string;
}

const previews = new Map<string, Preview>();

export function guardarPreview(documentoId: string, p: Preview) {
  previews.set(documentoId, p);
}

export function obterPreview(documentoId: string, nomeArquivo: string, mime: string) {
  if (nomeArquivo.startsWith("amostra-")) return { url: `/amostras/${nomeArquivo}`, mime };
  return previews.get(documentoId);
}
