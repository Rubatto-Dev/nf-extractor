import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { Nota } from "../domain/nota";
import { validarNota } from "../domain/validacao";
import amostras from "./amostras.json";
import { ExtratorFake } from "./extrator-fake";

const arquivo = (nome: string) => ({
  nome,
  mime: "application/pdf" as const,
  bytes: new Uint8Array([1]),
});

describe("ExtratorFake", () => {
  it("devolve uma nota consistente, sem custo e sem rede, para arquivo qualquer", async () => {
    const r = await new ExtratorFake().extrair(arquivo("x.pdf"));
    expect(r).toMatchObject({ modelo: "fake", custoUsd: 0, saidaBruta: { arquivo: "x.pdf" } });
    expect(validarNota(r.nota, "2026-10-28")).toEqual([]);
  });

  it("devolve o gabarito da nota de exemplo, que passa nas regras do domínio", async () => {
    const r = await new ExtratorFake().extrair(arquivo("amostra-cupom.jpg"));
    expect(r.nota.cnpjEmitente).toBe("97984542000188");
    expect(validarNota(r.nota, "2026-10-01")).toEqual([]);
  });

  it("mantém as notas de exemplo iguais ao gabarito do eval", async () => {
    const gabarito = JSON.parse(await readFile("eval/gabarito.json", "utf8")) as {
      id: string;
      nota: Nota;
    }[];
    const porId = new Map(gabarito.map((g) => [g.id, g.nota]));
    expect(amostras).toEqual({
      "amostra-danfe.pdf": porId.get("nota-01"),
      "amostra-danfe-foto.jpg": porId.get("nota-13"),
      "amostra-cupom.jpg": porId.get("nota-23"),
    });
  });
});
