import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConfig } from "./config";

let db: PostgresJsDatabase | undefined;

export function getDb(): PostgresJsDatabase {
  // prepare: false porque o pooler do Neon roda em modo transação
  db ??= drizzle(postgres(getConfig().DATABASE_URL, { max: 5, prepare: false }));
  return db;
}
