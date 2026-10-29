import { describe, expect, it } from "vitest";
import { validarNota } from "../src/nf/domain/validacao";
import { DATA_REFERENCIA, gerarNotasSinteticas } from "./sintetico";

describe("gerarNotasSinteticas", () => {
  const notas = gerarNotasSinteticas();

  it("gera 30 notas no mix 10 DANFE PDF, 10 DANFE foto, 10 NFC-e foto", () => {
    expect(notas).toHaveLength(30);
    const porFormato = Object.groupBy(notas, (n) => n.formato);
    expect(porFormato["danfe-pdf"]).toHaveLength(10);
    expect(porFormato["danfe-foto"]).toHaveLength(10);
    expect(porFormato["nfce-foto"]).toHaveLength(10);
  });

  it("é determinístico", () => {
    expect(gerarNotasSinteticas()).toEqual(notas);
  });

  it("todo gabarito passa nas regras do domínio", () => {
    for (const n of notas) expect(validarNota(n.nota, DATA_REFERENCIA), n.id).toEqual([]);
  });

  it("cobre desconto, frete, quantidade fracionada e CNPJ alfanumérico", () => {
    expect(notas.filter((n) => n.nota.desconto > 0).length).toBeGreaterThanOrEqual(6);
    expect(notas.some((n) => n.nota.frete > 0)).toBe(true);
    expect(notas.some((n) => n.nota.itens.some((i) => !Number.isInteger(i.quantidade)))).toBe(true);
    expect(notas.some((n) => /[A-Z]/.test(n.nota.cnpjEmitente))).toBe(true);
  });
});
