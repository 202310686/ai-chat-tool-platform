import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await params;
  const chat = await (await db()).query<{ id: string; title: string }>(
    "SELECT id, title FROM chats WHERE id = $1 AND user_id = $2", [id, userId]
  );
  if (!chat.rows[0]) return Response.json({ error: "对话不存在" }, { status: 404 });
  const messages = await (await db()).query<{ id: string; role: "user" | "assistant"; content: string }>(
    "SELECT id, role, content FROM messages WHERE chat_id = $1 ORDER BY created_at, id", [id]
  );
  return Response.json({ ...chat.rows[0], messages: messages.rows });
}

export async function DELETE(_req: Request, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await params;
  const result = await (await db()).query<{ id: string }>(
    "DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]
  );
  return Response.json({ ok: Boolean(result.rows[0]) }, { status: result.rows[0] ? 200 : 404 });
}

