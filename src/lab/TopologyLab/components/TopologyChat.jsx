import React, { useEffect, useRef, useState } from "react";

function detectDirection(text) {
  return /[\u0600-\u06FF]/.test(String(text || "")) ? "rtl" : "ltr";
}

function normalizeMixedSpacing(text) {
  return String(text || "")
    .replace(/\s*([:،؛])\s*/g, "$1 ")
    .replace(/([A-Za-z0-9][A-Za-z0-9_\-().,+/*^%]*):(?=[\u0600-\u06FF])/g, "$1: ")
    .replace(/([\u0600-\u06FF])(?=[A-Za-z0-9])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderMixedText(text) {
  const value = normalizeMixedSpacing(text);
  if (!value) return null;
  const parts = value.split(/([A-Za-z0-9][A-Za-z0-9_\-().,:=+/*^% ]*)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^[A-Za-z0-9]/.test(part)) {
      return (
        <bdi key={`m-${index}`} dir="ltr" className="topology-inline-ltr">
          {part}
        </bdi>
      );
    }
    return <React.Fragment key={`m-${index}`}>{part}</React.Fragment>;
  });
}

export default function TopologyChat({
  messages = [],
  onSendMessage,
  onQuickAction,
  isBusy = false,
  onCloseChat
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || isBusy || typeof onSendMessage !== "function") return;
    setSending(true);
    try {
      await onSendMessage(text);
      setInput("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="topology-chat">
      <div className="topology-chat-header">
        <h4 className="topology-chat-title">
          <span className="topology-chat-title-icon" aria-hidden="true">◎</span>
          <span>شات الذكاء الاصطناعي</span>
        </h4>

        <div className="topology-chat-header-actions">
          <span>{sending || isBusy ? "جارٍ التحليل..." : "جاهز"}</span>
          {typeof onCloseChat === "function" && (
            <button
              type="button"
              className="topology-chat-close"
              onClick={onCloseChat}
              aria-label="Close chat"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="topology-chat-feed" ref={feedRef}>
        {messages.map((msg, index) => {
          const direction = detectDirection(`${msg.content || ""} ${msg.visual_hint || ""}`);
          const quickAction = msg.action && msg.action.type ? msg.action : null;
          const quickLabel = quickAction?.label || "تطبيق";
          return (
            <div
              key={`${msg.role}-${index}`}
              className={`topology-chat-message ${msg.role} ${direction}`}
              dir="auto"
            >
              <div className="topology-chat-content">{renderMixedText(msg.content)}</div>
              {msg.visual_hint && <div className="topology-chat-hint">{renderMixedText(msg.visual_hint)}</div>}
              {msg.mathConcept && <div className="topology-chat-concept">{renderMixedText(msg.mathConcept)}</div>}
              {quickAction && typeof onQuickAction === "function" && (
                <button
                  type="button"
                  className="topology-chat-action"
                  onClick={() => onQuickAction(quickAction)}
                  disabled={sending || isBusy}
                >
                  {quickLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="topology-chat-input">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          placeholder='جرّب: "اشرح self-intersection ببساطة" أو "بدّل إلى trefoil"'
          disabled={sending || isBusy}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || isBusy || !input.trim()}
        >
          إرسال
        </button>
      </div>
    </div>
  );
}
