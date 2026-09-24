import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const result = await (await db()).query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  return result.rows[0]?.id ?? null;
}

