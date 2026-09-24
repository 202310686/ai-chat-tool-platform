import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import path from "node:path";
import fs from "node:fs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("请先在 .env.local 设置 DATABASE_URL，再执行 pnpm db:migrate。");
  process.exit(1);
}
const dataDir = path.join(process.cwd(), ".data", "postgres");
if (!fs.existsSync(dataDir)) {
  console.error("本地 PGlite 数据目录不存在；外部数据库会在首次启动时自动建表。");
  process.exit(1);
}
const tick = String.fromCharCode(96);
const source = fs.readFileSync(path.join(process.cwd(), "lib", "db.ts"), "utf8");
const schema = source.split("const schema = " + tick)[1]?.split(tick + ";")[0];
if (!schema) throw new Error("找不到数据库建表语句");

const local = new PGlite(dataDir);
const remote = new pg.Client({ connectionString });
try {
  await remote.connect();
  await remote.query("BEGIN");
  await remote.query(schema);
  const users = (await local.query("SELECT id, email, password_hash, created_at FROM users")).rows;
  const chats = (await local.query("SELECT id, user_id, title, created_at, updated_at FROM chats")).rows;
  const messages = (await local.query("SELECT id, chat_id, role, content, created_at FROM messages")).rows;
  for (const row of users) {
    await remote.query(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING",
      [row.id, row.email, row.password_hash, row.created_at]
    );
  }
  for (const row of chats) {
    await remote.query(
      "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
      [row.id, row.user_id, row.title, row.created_at, row.updated_at]
    );
  }
  for (const row of messages) {
    await remote.query(
      "INSERT INTO messages (id, chat_id, role, content, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
      [row.id, row.chat_id, row.role, row.content, row.created_at]
    );
  }
  await remote.query("COMMIT");
  const counts = await Promise.all(["users", "chats", "messages"].map(async (name) => {
    const result = await remote.query("SELECT count(*)::int AS count FROM " + name);
    return name + "=" + result.rows[0].count;
  }));
  console.log("迁移完成：" + counts.join(", ") + "（本地源记录：users=" + users.length + ", chats=" + chats.length + ", messages=" + messages.length + "）");
} catch (error) {
  await remote.query("ROLLBACK").catch(() => {});
  console.error("迁移失败：", error.message);
  process.exitCode = 1;
} finally {
  await local.close();
  await remote.end();
}

