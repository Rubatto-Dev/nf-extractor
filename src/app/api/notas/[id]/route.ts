import { z } from "zod";
import { revisarNota } from "@/nf/application/notas";
import { hojeEmBrasilia } from "@/nf/domain/datas";
import { repositorio } from "@/nf/infra/container";
import { respostaDeErro } from "@/nf/infra/http";

const centavos = z.number().int();

const CorpoRevisao = z.object({
  aprovar: z.boolean(),
  nota: z.object({
    cnpjEmitente: z.string().max(18),
    dataEmissao: z.string().max(20),
    valorTotal: centavos,
    desconto: centavos.nonnegative(),
    frete: centavos.nonnegative(),
    itens: z
      .array(
        z.object({
          descricao: z.string().min(1, "Item sem descrição.").max(200),
          quantidade: z.number().positive("Quantidade precisa ser maior que zero."),
          valorUnitario: z.number().nonnegative(),
          valorTotal: centavos,
        }),
      )
      .max(500),
  }),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/notas/[id]">) {
  try {
    const { id } = await ctx.params;
    const corpo = CorpoRevisao.parse(await request.json());
    const sinalizacoes = await revisarNota(
      repositorio(),
      id,
      corpo.nota,
      corpo.aprovar,
      hojeEmBrasilia(new Date()),
    );
    return Response.json({ sinalizacoes });
  } catch (err) {
    return respostaDeErro(err, "PATCH /api/notas/[id]");
  }
}
