import { db } from "@/lib/db";

type Kind = "chat" | "structured";

function dailyLimit(kind: Kind) {
  const configured = Number(process.env[kind === "chat" ? "CHAT_DAILY_LIMIT" : "STRUCTURED_DAILY_LIMIT"]);
  const fallback = kind === "chat" ? 20 : 10;
  return Number.isInteger(configured) && configured > 0 ? Math.min(configured, 500) : fallback;
}

export async function consumeQuota(userId: string, kind: Kind) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const limit = dailyLimit(kind);
  const result = await (await db()).query<{ count: number }>(`
    INSERT INTO usage_counters (user_id, day, kind, count)
    VALUES ($1, $2, $3, 1)
    ON CONFLICT (user_id, day, kind)
    DO UPDATE SET count = usage_counters.count + 1
      WHERE usage_counters.count < $4
    RETURNING count
  `, [userId, day, kind, limit]);
  return { allowed: result.rows.length > 0, limit };
}
