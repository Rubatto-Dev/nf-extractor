import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/nf/infra/db";
import { logger } from "@/nf/infra/logger";

export async function GET() {
  await connection();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (err) {
    logger.error({ err }, "health: banco indisponível");
    return Response.json({ status: "erro", banco: "indisponivel" }, { status: 503 });
  }
}
