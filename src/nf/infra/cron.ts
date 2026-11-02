import { timingSafeEqual } from "node:crypto";

/** A Vercel chama o cron com `Authorization: Bearer <CRON_SECRET>`. */
export function cronAutorizado(cabecalho: string | null, segredo: string): boolean {
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(cabecalho ?? "");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
