# Flow AI · 智能对话与工具调用平台

基于 TypeScript、Next.js、Vercel AI SDK、PostgreSQL 与 Auth.js 的全栈 AI 对话项目。

**在线体验：** [https://8-217-169-64.sslip.io](https://8-217-169-64.sslip.io)（部署于阿里云 ECS；首次使用需注册账号）。

## 已实现功能

- 邮箱注册、登录、退出：Auth.js Credentials + bcrypt 密码哈希 + JWT 会话。
- 可选注册邀请码；按账号限制每日模型调用，避免公开体验站意外产生大量费用。
- 流式聊天、多轮上下文、会话列表、记录持久化及用户数据隔离。
- AI 回复支持 Markdown、代码块、表格与一键复制；聊天列表有加载、失败重试提示。
- `/api/health` 可检查应用与数据库是否可用，方便排查 ECS 与浏览器问题。
- 页面异常时显示可重试的错误提示，不再只留下空白内容。
- 模型工具调用：北京时间与四则运算；工具执行结果会返回模型继续生成答案。
- 结构化输出：将原始文字提取为标题、摘要、要点、待办事项，使用 AI SDK JSON 模式 + Zod Schema 校验。
- 支持 DeepSeek 与 OpenAI 兼容接口。
- PostgreSQL 存储：本地默认使用嵌入式 PostgreSQL（PGlite）；填写 `DATABASE_URL` 后连接独立 PostgreSQL。

## 本地运行

要求 Node.js 20.9+、pnpm。

1. `pnpm install`
2. 复制 `env.example` 为 `.env.local`，填写 `AUTH_SECRET`、`DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`。**不要提交或分享密钥。**
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
| `AUTH_TRUST_HOST` | 通过反向代理部署时设为 `true` |
| `DEEPSEEK_API_KEY` | DeepSeek 密钥；配置后优先于 OpenAI |
| `DEEPSEEK_MODEL` | 默认 `deepseek-flash` |
| `OPENAI_API_KEY` | OpenAI 密钥，未配置 DeepSeek 时使用 |
| `OPENAI_MODEL` | 默认 `gpt-4o-mini` |
| `OPENAI_BASE_URL` | 可选的 OpenAI 兼容接口地址 |
| `DATABASE_URL` | 可选；独立 PostgreSQL 连接串 |
| `REGISTRATION_CODE` | 可选；设置后注册时必须输入邀请码，推荐公开部署时设置 |
| `CHAT_DAILY_LIMIT` | 每个账号每天最多对话次数，默认 20 |
| `STRUCTURED_DAILY_LIMIT` | 每个账号每天最多结构化整理次数，默认 10 |

每日额度按北京时间日期统计，请求发起后计入额度（即使模型调用随后失败）。聊天仅携带最近 12 条历史消息、单条输入最多 4000 字、单次输出最多 800 token，以控制模型成本。额度保存在当前数据库中；不设置邀请码仍允许公开注册，无法阻止通过大量新账号绕过按账号额度。

## 面试演示路线

注册 → 新建对话 → 问“128×36 等于多少，请调用计算器” → 观察工具调用和流式回复 → 刷新并重新打开对话展示持久化 → 点击“结构化整理”，输入会议纪要并展示经过 Schema 校验的 JSON。

## 验证

```bash
pnpm lint
pnpm build
node --test tests/quota-sql.test.mjs
node --test tests/markdown.test.mjs
```

代码位于 `app/api`、`components`、`lib`；数据库迁移脚本位于 `scripts/migrate-to-postgres.mjs`。

## ECS 更新线上版本

GitHub 推送不会自动修改服务器。每次推送后，在 ECS Workbench 执行：

```bash
cd /opt/ai-chat-tool-platform
git pull --ff-only origin master
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart ai-platform
sudo systemctl is-active ai-platform
curl -fsS http://127.0.0.1:3000/api/health
```

预期服务状态为 `active`，健康检查返回 `{"status":"ok"}`。公网地址保持不变；`.env.local`、`.data` 不在 Git 中，更新时会保留。HTTPS 由 Caddy 反向代理提供。

> 公开体验站会产生模型调用费用。建议在 ECS 的 `.env.local` 中设置 `REGISTRATION_CODE`，并在模型服务商控制台设置额度/用量告警。修改环境变量后需重启 `ai-platform`；不要将 `.env.local`、邀请码、API Key 或数据库密码提交到 GitHub。

