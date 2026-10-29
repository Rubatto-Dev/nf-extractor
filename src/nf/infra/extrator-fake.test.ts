import { describe, expect, it } from "vitest";
import { validarNota } from "../domain/validacao";
import { ExtratorFake } from "./extrator-fake";

describe("ExtratorFake", () => {
  it("devolve uma nota consistente, sem custo e sem rede", async () => {
    const r = await new ExtratorFake().extrair({
      nome: "x.pdf",
      mime: "application/pdf",
      bytes: new Uint8Array([1]),
    });
    expect(r).toMatchObject({ modelo: "fake", custoUsd: 0, saidaBruta: { arquivo: "x.pdf" } });
    expect(validarNota(r.nota, "2026-10-28")).toEqual([]);
  });
});
