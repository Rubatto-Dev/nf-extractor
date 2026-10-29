import Anthropic from "@anthropic-ai/sdk";
import type { DepsExtrairNota } from "../application/extrair-nota";
import type { Extrator, NotaRepositorio } from "../application/portas";
import { ClaudeExtrator } from "./claude-extrator";
import { getConfig } from "./config";
import { getDb } from "./db";
import { DrizzleNotaRepositorio } from "./drizzle-nota-repositorio";
import { ExtratorFake } from "./extrator-fake";

let extrator: Extrator | undefined;

export function repositorio(): NotaRepositorio {
  return new DrizzleNotaRepositorio(getDb());
}

export function depsExtrairNota(): DepsExtrairNota {
  const c = getConfig();
  extrator ??=
    c.EXTRACTOR === "fake"
      ? new ExtratorFake()
      : new ClaudeExtrator(new Anthropic({ apiKey: c.ANTHROPIC_API_KEY }), c.EXTRACTION_MODEL);
  return { repo: repositorio(), extrator, tetoDiarioUsd: c.DAILY_BUDGET_USD };
}
