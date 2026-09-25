import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, type ModelMessage, type UIMessage } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { consumeQuota } from "@/lib/quota";

export const maxDuration = 60;
const bodySchema = z.object({ chatId: z.uuid(), messages: z.array(z.any()).min(1) });

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "请先登录" }, { status: 401 });
  const usingDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "请在 .env.local 配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY" }, { status: 503 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请求格式错误" }, { status: 400 });
  const { chatId, messages } = parsed.data;
  const chat = await (await db()).query<{ id: string }>(
    "SELECT id FROM chats WHERE id = $1 AND user_id = $2", [chatId, userId]
  );
  if (!chat.rows[0]) return Response.json({ error: "对话不存在" }, { status: 404 });
  const last = messages.at(-1) as UIMessage | undefined;
  const content = last?.role === "user"
    ? last.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim()
    : "";
  if (!content || content.length > 4000) return Response.json({ error: "消息为空或超过 4000 字" }, { status: 400 });

  const quota = await consumeQuota(userId, "chat");
  if (!quota.allowed) return Response.json({ error: `今日对话次数已达 ${quota.limit} 次，请明天再试。` }, { status: 429 });

  const database = await db();
  const history = await database.query<{ role: "user" | "assistant"; content: string }>(
    "SELECT role, content FROM (SELECT role, content, created_at, id FROM messages WHERE chat_id = $1 ORDER BY created_at DESC, id DESC LIMIT 12) recent ORDER BY created_at, id", [chatId]
  );
  await database.query("INSERT INTO messages (chat_id, role, content) VALUES ($1, 'user', $2)", [chatId, content]);
  await database.query(
    "UPDATE chats SET title = CASE WHEN title = '新对话' THEN $2 ELSE title END, updated_at = now() WHERE id = $1",
    [chatId, content.slice(0, 28)]
  );

  const modelMessages: ModelMessage[] = [
    ...history.rows.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content },
  ];
  const provider = createOpenAI({
    apiKey,
    baseURL: usingDeepSeek ? "https://api.deepseek.com" : process.env.OPENAI_BASE_URL,
  });
  const result = streamText({
    model: provider.chat(usingDeepSeek ? (process.env.DEEPSEEK_MODEL || "deepseek-flash") : (process.env.OPENAI_MODEL || "gpt-4o-mini")),
    system: "你是一个简洁、可靠的中文 AI 助手。涉及计算和当前时间时优先使用工具；不编造工具结果。",
    messages: modelMessages,
    maxOutputTokens: 800,
    stopWhen: stepCountIs(3),
    tools: {
      currentTime: tool({
        description: "获取当前北京时间",
        inputSchema: z.object({}),
        execute: async () => ({ time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }), timezone: "Asia/Shanghai" }),
      }),
      calculator: tool({
        description: "计算两个数字的加减乘除",
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
          operation: z.enum(["add", "subtract", "multiply", "divide"]),
        }),
        execute: async ({ a, b, operation }) => ({
          result: operation === "add" ? a + b : operation === "subtract" ? a - b : operation === "multiply" ? a * b : b === 0 ? "除数不能为零" : a / b,
        }),
      }),
    },
    onFinish: async ({ text }) => {
      if (text.trim()) {
        await database.query("INSERT INTO messages (chat_id, role, content) VALUES ($1, 'assistant', $2)", [chatId, text]);
        await database.query("UPDATE chats SET updated_at = now() WHERE id = $1", [chatId]);
      }
    },
  });
  return result.toUIMessageStreamResponse();
}


