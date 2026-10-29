import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { gerarNotasSinteticas } from "./sintetico";
import { danfeHtml, fotoHtml, nfceHtml } from "./templates";

// Uso: npm run eval:gerar → eval/notas/*.pdf|jpg (não versionado) + eval/gabarito.json (versionado)
const SAIDA = "eval/notas";

async function main() {
  const notas = gerarNotasSinteticas();
  await mkdir(SAIDA, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1.5 });

  const gabarito = [];
  for (const [i, s] of notas.entries()) {
    const html = s.formato === "nfce-foto" ? nfceHtml(s) : danfeHtml(s);
    let arquivo: string;
    if (s.formato === "danfe-pdf") {
      arquivo = `${s.id}.pdf`;
      await page.setContent(html);
      await writeFile(
        `${SAIDA}/${arquivo}`,
        await page.pdf({ format: "A4", printBackground: true }),
      );
    } else {
      arquivo = `${s.id}.jpg`;
      const angulo = ((i * 37) % 7) - 3;
      const inclinacao = 4 + ((i * 13) % 8);
      await page.setContent(fotoHtml(html, angulo, inclinacao));
      await page
        .locator(".cena")
        .screenshot({ path: `${SAIDA}/${arquivo}`, type: "jpeg", quality: 70 });
    }
    gabarito.push({ id: s.id, arquivo, formato: s.formato, nota: s.nota });
  }
  await browser.close();
  await writeFile("eval/gabarito.json", `${JSON.stringify(gabarito, null, 2)}\n`);
  console.log(`${gabarito.length} notas em ${SAIDA}/ e gabarito em eval/gabarito.json`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
