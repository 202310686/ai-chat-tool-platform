import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import path from "node:path";
import { mkdirSync } from "node:fs";

type Row = Record<string, unknown>;
interface Database { query<T extends Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }
const globalDb = globalThis as unknown as { __db?: Promise<Database> };
const schema = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新对话',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chats_user_updated ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_chat_created ON messages(chat_id, created_at);
`;

export async function db(): Promise<Database> {
  if (!globalDb.__db) {
    globalDb.__db = (async () => {
      if (process.env.DATABASE_URL) {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query(schema);
        return pool as Database;
      }
      const dataDir = path.join(process.cwd(), ".data", "postgres");
      mkdirSync(path.dirname(dataDir), { recursive: true });
      const pg = new PGlite(dataDir);
      await pg.exec(schema);
      return pg as Database;
    })();
  }
  return globalDb.__db;
}


