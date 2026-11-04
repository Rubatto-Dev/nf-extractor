import { describe, expect, it } from "vitest";
import { cronAutorizado } from "./cron";

const SEGREDO = "s".repeat(32);

describe("cronAutorizado", () => {
  it("aceita só o Bearer com o segredo exato", () => {
    expect(cronAutorizado(`Bearer ${SEGREDO}`, SEGREDO)).toBe(true);
    expect(cronAutorizado(`Bearer ${SEGREDO}x`, SEGREDO)).toBe(false);
    expect(cronAutorizado(`Bearer ${"t".repeat(32)}`, SEGREDO)).toBe(false);
    expect(cronAutorizado(SEGREDO, SEGREDO)).toBe(false);
    expect(cronAutorizado(null, SEGREDO)).toBe(false);
  });
});
