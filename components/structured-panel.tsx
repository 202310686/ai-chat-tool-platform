"use client";

import { useState } from "react";
import { Braces, Copy, Loader2, X } from "lucide-react";

type Result = {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
};

export default function StructuredPanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/structured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "整理失败");
      setResult(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "整理失败");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="structured-backdrop" onMouseDown={onClose}>
      <section className="structured-panel" role="dialog" aria-modal="true" aria-label="结构化整理" onMouseDown={(event) => event.stopPropagation()}>
        <div className="structured-head">
          <div><span className="structured-icon"><Braces size={18} /></span><strong>结构化整理</strong></div>
          <button aria-label="关闭" onClick={onClose}><X size={19} /></button>
        </div>
        <p className="structured-description">粘贴一段文字，AI 会按固定字段提取标题、摘要、关键要点与待办事项，并返回经过 Schema 校验的 JSON。</p>
        <label className="structured-label" htmlFor="structured-input">原始内容</label>
        <textarea id="structured-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="例如：周五下午三点开项目例会，讨论登录页面和聊天记录功能。小李负责修复登录问题，周一前完成。" maxLength={6000} />
        <div className="structured-actions"><span>{text.length}/6000</span><button onClick={run} disabled={busy || !text.trim()}>{busy ? <Loader2 size={16} className="spin" /> : <Braces size={16} />}{busy ? "正在整理…" : "生成结构化结果"}</button></div>
        {error && <p className="structured-error">{error}</p>}
        {result && <div className="structured-result">
          <div className="structured-result-title"><strong>提取结果</strong><button onClick={copy}><Copy size={14} /> {copied ? "已复制" : "复制 JSON"}</button></div>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>}
      </section>
    </div>
  );
}

