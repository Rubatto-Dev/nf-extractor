/** "2026-10-20" → "20/10/2026"; devolve o texto como veio se não for ISO. */
export function isoParaBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** "20/10/2026" → "2026-10-20"; devolve o texto como veio se não for dd/mm/aaaa, para o domínio sinalizar. */
export function brParaIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : br.trim();
}

const FUSO_BRASILIA = "America/Sao_Paulo";

/** Data de hoje em Brasília, no formato ISO. */
export function hojeEmBrasilia(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_BRASILIA }).format(agora);
}
