export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getConfig } = await import("./nf/infra/config");
  const { logger } = await import("./nf/infra/logger");
  try {
    const c = getConfig();
    logger.info({ extrator: c.EXTRACTOR, modelo: c.EXTRACTION_MODEL }, "configuração validada");
  } catch (err) {
    logger.fatal({ err }, "falha ao subir");
    throw err;
  }
}
