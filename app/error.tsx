"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("Page render failed", error);
  }, [error]);

  return (
    <main className="error-shell">
      <section className="error-card" role="alert">
        <span className="error-icon"><AlertTriangle size={24} /></span>
        <h1>页面暂时没有加载成功</h1>
        <p>可以先重试。如果问题持续，请检查服务器状态；已有聊天记录不会因刷新而被删除。</p>
        <button onClick={retry}><RotateCcw size={16} /> 重新加载</button>
      </section>
    </main>
  );
}
