import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, RotateCcw, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "How does the FCRA adverse action process work?",
  "What's the difference between Employment and Tenant screening?",
  "How do I read confidence scores on check results?",
  "What does the DOT drug test MRO review mean?",
  "How do I enroll a candidate in continuous monitoring?",
  "What AI tools are available on a candidate's profile?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-sm"
          }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);
      if (!open) setUnread(true);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">ScreenIQ Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[11px] text-slate-400">AI-powered · always available</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                  title="Clear conversation"
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 max-h-[420px]">
            {isEmpty ? (
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-slate-100 leading-relaxed">
                    Hi! I'm the ScreenIQ Assistant. I can help you with screening workflows, FCRA compliance, interpreting check results, platform navigation, and more.
                    <br /><br />
                    What can I help you with?
                  </div>
                </div>
                <div className="pl-9 space-y-2">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Suggested questions</p>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-xs text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-900/60 rounded-xl px-3 py-2 transition-colors leading-snug"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {loading && <TypingIndicator />}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-800 bg-slate-900/95">
            <div className="flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about ScreenIQ…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none leading-relaxed max-h-24"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0 mb-0.5"
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
            <p className="text-[10px] text-slate-600 text-center mt-1.5">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}

      {/* ── Floating button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/60 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="ScreenIQ Assistant"
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <Bot size={24} className="text-white" />
        )}
        {unread && !open && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
        )}
      </button>
    </>
  );
}
