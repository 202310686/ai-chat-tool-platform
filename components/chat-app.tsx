"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ArrowUp, Bot, Braces, Calculator, Clock3, Menu, MessageSquare, Plus, Sparkles, Trash2, X } from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import StructuredPanel from "@/components/structured-panel";

type Chat = { id: string; title: string; updated_at: string };
type SavedMessage = { id: string; role: "user" | "assistant"; content: string };
const prompts = [
  { icon: Sparkles, title: "头脑风暴", prompt: "帮我为一个大学生 AI 学习助手想 5 个实用功能。" },
  { icon: Calculator, title: "快速计算", prompt: "请使用计算器工具计算 128 乘以 36。" },
  { icon: Clock3, title: "查询时间", prompt: "现在北京时间是几点？请调用工具。" },
];

export default function ChatApp({ email }: { email: string }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [initial, setInitial] = useState<UIMessage[]>([]);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queued, setQueued] = useState("");
  const [notice, setNotice] = useState("");
  const [showStructured, setShowStructured] = useState(false);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!creating && !showStructured) void newChat();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  });

  const refreshChats = useCallback(async () => {
    const response = await fetch("/api/chats");
    if (response.ok) setChats(await response.json());
  }, []);

  useEffect(() => {
    fetch("/api/chats").then((response) => response.ok ? response.json() : []).then(setChats).catch(() => setChats([]));
  }, []);

  async function openChat(id: string) {
    setNotice("");
    const response = await fetch("/api/chats/" + id);
    if (!response.ok) { setNotice("读取对话失败"); return; }
    const data: { messages: SavedMessage[] } = await response.json();
    setInitial(data.messages.map((m) => ({ id: m.id, role: m.role, parts: [{ type: "text", text: m.content }] })));
    setSelected(id);
    setQueued("");
    setSidebarOpen(false);
  }

  async function newChat(prompt = "") {
    setCreating(true);
    setNotice("");
    try {
      const response = await fetch("/api/chats", { method: "POST" });
      if (!response.ok) throw new Error("创建对话失败");
      const chat: Chat = await response.json();
      setInitial([]);
      setSelected(chat.id);
      setQueued(prompt);
      setSidebarOpen(false);
      await refreshChats();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建对话失败");
    } finally {
      setCreating(false);
    }
  }

  async function deleteChat(id: string) {
    if (!window.confirm("确定删除这段对话吗？")) return;
    const response = await fetch("/api/chats/" + id, { method: "DELETE" });
    if (!response.ok) { setNotice("删除失败"); return; }
    if (selected === id) { setSelected(null); setInitial([]); }
    await refreshChats();
  }

  const current = chats.find((chat) => chat.id === selected);
  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-overlay" aria-label="关闭侧栏" onClick={() => setSidebarOpen(false)} />}
      <aside className={"sidebar " + (sidebarOpen ? "sidebar-open" : "")}>
        <div className="sidebar-head">
          <div className="logo"><span><Sparkles size={19} /></span><strong>Flow AI</strong></div>
          <button className="icon-button mobile-close" aria-label="关闭侧栏" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>
        <button className="new-chat" disabled={creating} onClick={() => newChat()}><Plus size={18} /> 新建对话 <span>Ctrl/⌘ K</span></button>
        <div className="sidebar-label">最近对话</div>
        <div className="chat-list">
          {chats.length === 0 ? <p className="muted small empty-history">还没有对话，开始探索吧。</p> : chats.map((chat) => (
            <div key={chat.id} className={"chat-row " + (selected === chat.id ? "selected" : "")}>
              <button className="chat-select" onClick={() => openChat(chat.id)}><MessageSquare size={16} /><span>{chat.title}</span></button>
              <button className="delete-chat" aria-label={"删除" + chat.title} onClick={() => deleteChat(chat.id)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-icon"><Sparkles size={16} /></div><strong>你的 AI 灵感空间</strong><p>流式响应 · 多轮对话 · 智能工具</p></div>
          <div className="account-row"><div className="avatar">{email[0]?.toUpperCase()}</div><div><strong>{email.split("@")[0]}</strong><span>个人工作区</span></div><button onClick={() => signOut({ callbackUrl: "/login" })}>退出</button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="打开侧栏" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="topbar-title">{current?.title || "新对话"}</span><span className="topbar-chevron">⌄</span></div>
          <div className="topbar-actions"><button className="structured-open" onClick={() => setShowStructured(true)}><Braces size={15} /> 结构化整理</button><div className="model-pill"><span className="status-dot" /> AI 助手</div></div>
        </header>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {selected ? <ChatPanel key={selected} id={selected} initial={initial} queued={queued} onQueued={() => setQueued("")} onComplete={refreshChats} /> :
          <div className="welcome">
            <div className="welcome-icon"><Sparkles size={30} /></div>
            <div className="welcome-kicker">YOUR CREATIVE COMPANION</div>
            <h1>今天有什么新想法？</h1>
            <p>从一个问题开始，开启更高效的思考与创作。</p>
            <div className="prompt-grid">{prompts.map((item) => <button key={item.title} onClick={() => newChat(item.prompt)} disabled={creating}><item.icon size={20} /><strong>{item.title}</strong><span>{item.prompt}</span><ArrowUp size={16} className="prompt-arrow" /></button>)}</div>
            <button className="welcome-start" onClick={() => newChat()} disabled={creating}><Plus size={17} /> 开启空白对话</button>
          </div>}
      </main>
      {showStructured && <StructuredPanel onClose={() => setShowStructured(false)} />}
    </div>
  );
}

function ChatPanel({ id, initial, queued, onQueued, onComplete }: { id: string; initial: UIMessage[]; queued: string; onQueued: () => void; onComplete: () => void }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const { messages, sendMessage, status, error, stop } = useChat({
    id, messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { chatId: id } }),
  });
  const busy = status === "streaming" || status === "submitted";
  useEffect(() => {
    if (queued) { followLatest.current = true; void sendMessage({ text: queued }); onQueued(); }
  }, [queued, sendMessage, onQueued]);
  useEffect(() => { if (status === "ready" && messages.length) onComplete(); }, [status, messages.length, onComplete]);
  useEffect(() => {
    if (followLatest.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    followLatest.current = true;
    setInput("");
    void sendMessage({ text });
  }
  return (
    <>
      <div className="message-scroll" ref={scrollRef} onScroll={(event) => {
        const element = event.currentTarget;
        followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      }}>
        <div className="messages">
          {messages.length === 0 && <div className="chat-empty"><div className="welcome-icon small-icon"><Sparkles size={22} /></div><h2>开始一段新对话</h2><p>向 AI 助手提问，或尝试调用时间、计算工具。</p></div>}
          {messages.map((message) => <div key={message.id} className={"message " + message.role}>
            <div className="message-avatar">{message.role === "user" ? "我" : <Bot size={18} />}</div>
            <div className="message-body"><div className="message-name">{message.role === "user" ? "你" : "Flow AI"}</div>
              {message.parts.map((part, index) => part.type === "text" ? <div key={index} className="message-text">{part.text}</div> : part.type.startsWith("tool-") ? <div key={index} className="tool-chip"><Sparkles size={14} /> 已调用工具 · {part.type.replace("tool-", "")}</div> : null)}
            </div>
          </div>)}
          {busy && <div className="thinking"><span /><span /><span /> AI 正在思考</div>}
          {error && <div className="chat-error">发送失败：{error.message}</div>}
        </div>
      </div>
      <div className="composer-area">
        <div className="composer">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder="向 Flow AI 发送消息..." aria-label="聊天消息" rows={2} />
          <div className="composer-footer"><span><Sparkles size={14} /> 支持多轮对话与工具调用</span><button onClick={busy ? stop : submit} disabled={!busy && !input.trim()} aria-label={busy ? "停止生成" : "发送"}>{busy ? <span className="stop-square" /> : <ArrowUp size={19} />}</button></div>
        </div>
        <p className="composer-hint">AI 生成的内容可能有误，请核对重要信息。按 Enter 发送，Shift + Enter 换行。</p>
      </div>
    </>
  );
}




