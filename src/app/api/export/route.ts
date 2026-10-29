import { connection } from "next/server";
import { exportarCsv } from "@/nf/application/notas";
import { hojeEmBrasilia } from "@/nf/domain/datas";
import { repositorio } from "@/nf/infra/container";
import { respostaDeErro } from "@/nf/infra/http";

export async function GET() {
  await connection();
  try {
    const csv = await exportarCsv(repositorio());
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="notas-aprovadas-${hojeEmBrasilia(new Date())}.csv"`,
      },
    });
  } catch (err) {
    return respostaDeErro(err, "GET /api/export");
  }
}
