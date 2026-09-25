import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

const inputSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(72),
  inviteCode: z.string().max(128).optional(),
});

export async function POST(req: Request) {
  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请输入有效邮箱和至少 8 位密码。" }, { status: 400 });
  const requiredCode = process.env.REGISTRATION_CODE;
  if (requiredCode) {
    const supplied = createHash("sha256").update(parsed.data.inviteCode ?? "").digest();
    const expected = createHash("sha256").update(requiredCode).digest();
    if (!timingSafeEqual(supplied, expected)) {
      return Response.json({ error: "邀请码不正确。" }, { status: 403 });
    }
  }
  const email = parsed.data.email.toLowerCase();
  try {
    await (await db()).query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [
      email, await hash(parsed.data.password, 12),
    ]);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("register failed", error);
    if (String(error).includes("unique") || String(error).includes("duplicate")) {
      return Response.json({ error: "该邮箱已注册。" }, { status: 409 });
    }
    return Response.json({ error: "注册失败，请检查数据库配置。" }, { status: 500 });
  }
}


