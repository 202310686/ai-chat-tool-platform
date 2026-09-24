"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, LockKeyhole, Mail, Sparkles } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        const response = await fetch("/api/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "注册失败");
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("邮箱或密码错误");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="brand-mark"><Sparkles size={22} /></div>
        <div className="eyebrow">AI WORKSPACE</div>
        <h1>让想法，自由生长。</h1>
        <p className="login-subtitle">一个轻盈的 AI 对话工作台。随时提问、调用工具，所有灵感都能被好好保存。</p>
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>登录</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>注册</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label><span>邮箱地址</span><div className="input-wrap"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div></label>
          <label><span>密码</span><div className="input-wrap"><LockKeyhole size={17} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位密码" minLength={mode === "register" ? 8 : undefined} required /></div></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={busy} type="submit">{busy ? "请稍候..." : mode === "login" ? "进入工作台" : "创建账号"}<ArrowRight size={17} /></button>
        </form>
        <p className="login-footer"><Bot size={15} /> Powered by Next.js · Vercel AI SDK · PostgreSQL</p>
      </div>
    </main>
  );
}


