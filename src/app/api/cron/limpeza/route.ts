import { connection } from "next/server";
import { apagarExpiradas } from "@/nf/application/notas";
import { getConfig } from "@/nf/infra/config";
import { repositorio } from "@/nf/infra/container";
import { cronAutorizado } from "@/nf/infra/cron";
import { respostaDeErro } from "@/nf/infra/http";
import { logger } from "@/nf/infra/logger";

// Chamado pelo cron da Vercel (vercel.json). Só existe na demo: sem PURGE_AFTER_HOURS, responde 404.
export async function GET(request: Request) {
  await connection();
  const { PURGE_AFTER_HOURS: horas, CRON_SECRET: segredo } = getConfig();
  if (horas === undefined || segredo === undefined) return new Response(null, { status: 404 });
  if (!cronAutorizado(request.headers.get("authorization"), segredo)) {
    return new Response(null, { status: 401 });
  }
  try {
    const apagadas = await apagarExpiradas(repositorio(), new Date(), horas);
    logger.info({ apagadas, horas }, "limpeza da demo");
    return Response.json({ apagadas });
  } catch (err) {
    return respostaDeErro(err, "GET /api/cron/limpeza");
  }
}
