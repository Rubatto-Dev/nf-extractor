import { describe, expect, it } from "vitest";
import { ConfigInvalida, parseConfig } from "./config";

const base = { DATABASE_URL: "postgres://nf:nf@localhost:5433/nf" };

describe("parseConfig", () => {
  it("aplica os padrões com extrator fake", () => {
    const c = parseConfig({ ...base, EXTRACTOR: "fake" });
    expect(c).toMatchObject({
      EXTRACTOR: "fake",
      EXTRACTION_MODEL: "claude-sonnet-5-5",
      DAILY_BUDGET_USD: 1,
    });
  });

  it("exige a chave da API quando o extrator é o Claude", () => {
    expect(() => parseConfig({ ...base, ANTHROPIC_API_KEY: "" })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("aceita o extrator Claude com chave", () => {
    const c = parseConfig({ ...base, ANTHROPIC_API_KEY: "sk-test" });
    expect(c.EXTRACTOR).toBe("claude");
  });

  it("deixa a limpeza desligada por padrão e exige segredo quando ela é ligada", () => {
    const fake = { ...base, EXTRACTOR: "fake" };
    expect(parseConfig(fake).PURGE_AFTER_HOURS).toBeUndefined();
    expect(() => parseConfig({ ...fake, PURGE_AFTER_HOURS: "24" })).toThrow(/CRON_SECRET/);
    expect(() => parseConfig({ ...fake, PURGE_AFTER_HOURS: "24", CRON_SECRET: "curto" })).toThrow(
      /CRON_SECRET/,
    );
    const c = parseConfig({ ...fake, PURGE_AFTER_HOURS: "24", CRON_SECRET: "x".repeat(32) });
    expect(c.PURGE_AFTER_HOURS).toBe(24);
  });

  it("rejeita URL de banco que não é postgres e lista os problemas", () => {
    try {
      parseConfig({ DATABASE_URL: "mysql://x", EXTRACTOR: "fake", DAILY_BUDGET_USD: "-1" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigInvalida);
      expect((e as ConfigInvalida).problemas).toHaveLength(2);
    }
  });
});
