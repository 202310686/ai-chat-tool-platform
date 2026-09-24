import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "请先登录" }, { status: 401 });
  const result = await (await db()).query<{ id: string; title: string; updated_at: string }>(
    "SELECT id, title, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC", [userId]
  );
  return Response.json(result.rows);
}

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "请先登录" }, { status: 401 });
  const result = await (await db()).query<{ id: string; title: string }>(
    "INSERT INTO chats (user_id) VALUES ($1) RETURNING id, title", [userId]
  );
  return Response.json(result.rows[0], { status: 201 });
}

