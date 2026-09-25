import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { currentUserId } from "@/lib/user";
import { consumeQuota } from "@/lib/quota";

export const maxDuration = 60;
const requestSchema = z.object({ text: z.string().trim().min(1).max(6000) });
const resultSchema = z.object({
  title: z.string().min(1).describe("简短标题"),
  summary: z.string().min(1).describe("一句话摘要"),
  keyPoints: z.array(z.string()).max(8).describe("关键要点"),
  actionItems: z.array(z.string()).max(8).describe("可执行的下一步"),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "请先登录" }, { status: 401 });
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请输入 1–6000 字的内容" }, { status: 400 });

  const usingDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "请先配置模型 API Key" }, { status: 503 });

  const quota = await consumeQuota(userId, "structured");
  if (!quota.allowed) return Response.json({ error: `今日整理次数已达 ${quota.limit} 次，请明天再试。` }, { status: 429 });

  try {
    const provider = createOpenAI({
      apiKey,
      baseURL: usingDeepSeek ? "https://api.deepseek.com" : process.env.OPENAI_BASE_URL,
    });
    const { output } = await generateText({
      model: provider.chat(
        usingDeepSeek
          ? process.env.DEEPSEEK_MODEL || "deepseek-flash"
          : process.env.OPENAI_MODEL || "gpt-4o-mini"
      ),
      output: Output.json(),
      maxOutputTokens: 500,
      system: "你是中文信息整理助手。只依据输入内容提取信息，不编造事实。请只输出 JSON 对象，不要 Markdown。JSON 字段为 title 字符串、summary 字符串、keyPoints 字符串数组、actionItems 字符串数组。若没有可执行事项，actionItems 返回空数组。",
      prompt: `将下面内容整理为指定的结构化数据：\n\n${parsed.data.text}`,
    });
    const validated = resultSchema.safeParse(output);
    if (!validated.success) return Response.json({ error: "模型返回的 JSON 字段不完整，请重试。" }, { status: 502 });
    return Response.json({ data: validated.data });
  } catch (error) {
    console.error("Structured output failed:", error);
    return Response.json({ error: "结构化整理失败，请稍后重试并检查模型配置。" }, { status: 502 });
  }
}


