import { z } from "zod";

const vazioViraUndefined = (v: unknown) => (v === "" ? undefined : v);

const schema = z
  .object({
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "precisa ser uma URL postgres://"),
    EXTRACTOR: z.enum(["claude", "fake"]).default("claude"),
    ANTHROPIC_API_KEY: z.preprocess(vazioViraUndefined, z.string().min(1).optional()),
    EXTRACTION_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
    DAILY_BUDGET_USD: z.coerce.number().positive().default(1),
    // só a demo apaga notas; sem isto, a rota de limpeza fica desligada
    PURGE_AFTER_HOURS: z.preprocess(vazioViraUndefined, z.coerce.number().positive().optional()),
    CRON_SECRET: z.preprocess(vazioViraUndefined, z.string().min(16).optional()),
  })
  .refine((c) => c.EXTRACTOR === "fake" || c.ANTHROPIC_API_KEY !== undefined, {
    message: "obrigatória quando EXTRACTOR=claude",
    path: ["ANTHROPIC_API_KEY"],
  })
  .refine((c) => c.PURGE_AFTER_HOURS === undefined || c.CRON_SECRET !== undefined, {
    message: "obrigatório quando PURGE_AFTER_HOURS está definido",
    path: ["CRON_SECRET"],
  });

export type Config = z.infer<typeof schema>;

export class ConfigInvalida extends Error {
  constructor(readonly problemas: string[]) {
    super(`Configuração inválida: ${problemas.join("; ")}`);
    this.name = "ConfigInvalida";
  }
}

export function parseConfig(env: Record<string, string | undefined>): Config {
  const r = schema.safeParse(env);
  if (!r.success) {
    throw new ConfigInvalida(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  }
  return r.data;
}

let cache: Config | undefined;

export function getConfig(): Config {
  cache ??= parseConfig(process.env);
  return cache;
}
