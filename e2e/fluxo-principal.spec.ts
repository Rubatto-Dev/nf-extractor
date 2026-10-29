import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

// Fluxo principal com o extrator fake (sem rede): envia → revisa → aprova → exporta CSV.
// O PDF ganha bytes únicos no fim para não cair na deduplicação por sha256.
async function pdfUnico() {
  const base = await readFile("public/amostras/amostra-danfe.pdf");
  const marca = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { nome: `${marca}.pdf`, buffer: Buffer.concat([base, Buffer.from(`\n%${marca}\n`)]) };
}

test("health check responde com o banco de pé", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  expect(await r.json()).toEqual({ status: "ok" });
});

test("envia, corrige, aprova e exporta", async ({ page, request }) => {
  const { nome, buffer } = await pdfUnico();

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Notas" })).toBeVisible();
  await page.locator("#arquivo").setInputFiles({ name: nome, mimeType: "application/pdf", buffer });

  await expect(page).toHaveURL(/\/notas\/[0-9a-f-]{36}$/);
  const painel = page.getByRole("complementary", { name: "Dados extraídos" });
  await expect(painel.getByRole("heading", { name: "Dados extraídos" })).toBeVisible();
  await expect(painel.getByText("Sem alertas", { exact: true })).toBeVisible();

  // Erro de digitação no total do item: o domínio sinaliza e bloqueia a aprovação
  const totalItem = page.getByLabel("Total do item 1");
  await totalItem.fill("16,00");
  await expect(painel.getByText("2 alertas", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprovar" })).toBeDisabled();

  await totalItem.fill("15,00");
  await expect(painel.getByText("Sem alertas", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Aprovar" }).click();

  await expect(page).toHaveURL(/\/$/);
  const linha = page.getByRole("row").filter({ hasText: nome });
  await expect(linha.getByText("Aprovada")).toBeVisible();

  const csv = await (await request.get("/api/export")).text();
  expect(csv.startsWith("﻿arquivo;cnpj_emitente")).toBe(true);
  expect(csv).toContain(`${nome};11.222.333/0001-81;20/10/2026;42,00;5,00;12,00;1;`);
});

test("arquivo com formato não aceito mostra erro sem sair da tela", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page
    .locator("#arquivo")
    .setInputFiles({ name: "planilha.csv", mimeType: "text/csv", buffer: Buffer.from("a;b") });
  await expect(page.getByText("Formato não aceito. Use PDF, JPEG, PNG ou WebP.")).toBeVisible();
});

test("nota inexistente cai na página de não encontrada", async ({ page }) => {
  await page.goto("/notas/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: "Nota não encontrada" })).toBeVisible();
});
