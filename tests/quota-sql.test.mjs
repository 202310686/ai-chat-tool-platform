import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

test("daily quota insert and cap are atomic in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE users (id UUID PRIMARY KEY);
      CREATE TABLE usage_counters (
        user_id UUID NOT NULL REFERENCES users(id),
        day DATE NOT NULL,
        kind TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (user_id, day, kind)
      );
      INSERT INTO users VALUES ('00000000-0000-4000-8000-000000000001');
    `);
    const counts = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await db.query(`
        INSERT INTO usage_counters (user_id, day, kind, count)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (user_id, day, kind)
        DO UPDATE SET count = usage_counters.count + 1
          WHERE usage_counters.count < $4
        RETURNING count
      `, ["00000000-0000-4000-8000-000000000001", "2026-09-25", "chat", 2]);
      counts.push(result.rows[0]?.count ?? null);
    }
    assert.deepEqual(counts, [1, 2, null]);
  } finally {
    await db.close();
  }
});
