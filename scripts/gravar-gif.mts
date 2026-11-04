import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

// Grava o fluxo principal (enviar → revisar com alerta → corrigir → aprovar) e gera docs/demo.gif.
// Uso: npx tsx scripts/gravar-gif.mts [url]   (padrão: app local na 3100, com EXTRACTOR=fake e
// banco sem essa nota). Precisa de ffmpeg. Usa a foto de exemplo: o Chromium headless não
// desenha PDF dentro de <object>.
const BASE = process.argv[2] ?? "http://localhost:3100";
const SAIDA = "docs/demo.gif";
const TAMANHO = { width: 1280, height: 800 };

const pasta = await mkdtemp(join(tmpdir(), "nf-gif-"));
const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: TAMANHO,
  recordVideo: { dir: pasta, size: TAMANHO },
  locale: "pt-BR",
});
const page = await contexto.newPage();
const pausa = (ms: number) => page.waitForTimeout(ms);

const foto = await readFile("public/amostras/amostra-danfe-foto.jpg");

await page.goto(BASE);
await page.waitForLoadState("networkidle");
await pausa(1800);
await page
  .locator("#arquivo")
  .setInputFiles({ name: "amostra-danfe-foto.jpg", mimeType: "image/jpeg", buffer: foto });
await page.waitForURL(/\/notas\//);
await page.waitForLoadState("networkidle");
await pausa(2000);

// simula um erro de leitura no total do item 1 e depois a correção pela pessoa
const total = page.getByLabel("Total do item 1");
const original = await total.inputValue();
const errado = original.replace(/\d(?=,\d{2}$)/, (d) => String((Number(d) + 1) % 10));
await total.click();
await total.fill("");
await total.pressSequentially(errado, { delay: 140 });
await pausa(2500);
await total.fill("");
await total.pressSequentially(original, { delay: 140 });
await pausa(1500);
await page.getByRole("button", { name: "Aprovar" }).click();
await page.waitForURL((u) => u.pathname === "/");
await page.waitForLoadState("networkidle");
await pausa(2200);

await contexto.close();
await browser.close();

const [video] = (await readdir(pasta)).filter((f) => f.endsWith(".webm"));
if (!video) throw new Error("o Playwright não gravou o vídeo");
const filtro =
  "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer";
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  join(pasta, video),
  "-vf",
  filtro,
  SAIDA,
]);
await rm(pasta, { recursive: true, force: true });
console.log(`GIF em ${SAIDA}`);
