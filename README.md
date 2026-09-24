# Flow AI · 智能对话与工具调用平台

基于 TypeScript、Next.js、Vercel AI SDK、PostgreSQL 与 Auth.js 的全栈 AI 对话项目。

## 已实现功能

- 邮箱注册、登录、退出：Auth.js Credentials + bcrypt 密码哈希 + JWT 会话。
- 流式聊天、多轮上下文、会话列表、记录持久化及用户数据隔离。
- 模型工具调用：北京时间与四则运算；工具执行结果会返回模型继续生成答案。
- 结构化输出：将原始文字提取为标题、摘要、要点、待办事项，使用 AI SDK JSON 模式 + Zod Schema 校验。
- 支持 DeepSeek 与 OpenAI 兼容接口。
- PostgreSQL 存储：本地默认使用嵌入式 PostgreSQL（PGlite）；填写 `DATABASE_URL` 后连接独立 PostgreSQL。

## 本地运行

要求 Node.js 20.9+、pnpm。

1. `pnpm install`
2. 复制 `.env.example` 为 `.env.local`，填写 `AUTH_SECRET`、`DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`。**不要提交或分享密钥。**
3. `pnpm dev`
4. 打开 http://localhost:3000，注册账号开始使用。

项目会自动建表。本地数据默认保存在 `.data/postgres`，这两个路径均被 Git 忽略。

## 使用独立 PostgreSQL

在 `.env.local` 增加：

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

若已有本地 PGlite 聊天数据，先停止 Next.js 服务，再运行 `pnpm db:migrate` 将用户、会话、消息迁移到外部数据库。迁移脚本按 UUID 幂等写入，完成后再运行 `pnpm dev`。如果是全新数据库且无需旧数据，直接启动即可自动建表。

> 独立数据库连接需要你自己的服务与连接串；仓库不包含数据库密码。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `AUTH_SECRET` | Auth.js 会话签名密钥 |
| `AUTH_URL` | 本地一般为 `http://localhost:3000` |
| `DEEPSEEK_API_KEY` | DeepSeek 密钥；配置后优先于 OpenAI |
| `DEEPSEEK_MODEL` | 默认 `deepseek-flash` |
| `OPENAI_API_KEY` | OpenAI 密钥，未配置 DeepSeek 时使用 |
| `OPENAI_MODEL` | 默认 `gpt-4o-mini` |
| `OPENAI_BASE_URL` | 可选的 OpenAI 兼容接口地址 |
| `DATABASE_URL` | 可选；独立 PostgreSQL 连接串 |

## 面试演示路线

注册 → 新建对话 → 问“128×36 等于多少，请调用计算器” → 观察工具调用和流式回复 → 刷新并重新打开对话展示持久化 → 点击“结构化整理”，输入会议纪要并展示经过 Schema 校验的 JSON。

## 验证

```bash
pnpm lint
pnpm build
```

代码位于 `app/api`、`components`、`lib`；数据库迁移脚本位于 `scripts/migrate-to-postgres.mjs`。

