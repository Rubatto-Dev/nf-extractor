import { ArquivoInvalido } from "@/nf/application/erros";
import { extrairNota } from "@/nf/application/extrair-nota";
import { MIMES_ACEITOS, type MimeAceito } from "@/nf/application/portas";
import { depsExtrairNota } from "@/nf/infra/container";
import { respostaDeErro } from "@/nf/infra/http";
import { logger } from "@/nf/infra/logger";

export const maxDuration = 60;

const ehMimeAceito = (m: string): m is MimeAceito =>
  (MIMES_ACEITOS as readonly string[]).includes(m);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) throw new ArquivoInvalido("Envie o campo 'arquivo'.");
    if (!ehMimeAceito(arquivo.type)) {
      throw new ArquivoInvalido("Formato não aceito. Use PDF, JPEG, PNG ou WebP.");
    }

    const r = await extrairNota(depsExtrairNota(), {
      nome: arquivo.name,
      mime: arquivo.type,
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
    });
    logger.info({ documentoId: r.documentoId, reaproveitado: r.reaproveitado }, "nota extraída");
    return Response.json(r, { status: r.reaproveitado ? 200 : 201 });
  } catch (err) {
    return respostaDeErro(err, "POST /api/notas");
  }
}
