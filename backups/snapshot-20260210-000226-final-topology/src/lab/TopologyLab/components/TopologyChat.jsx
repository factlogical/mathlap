import React, { useEffect, useRef, useState } from "react";

function detectDirection(text) {
  return /[\u0600-\u06FF]/.test(String(text || "")) ? "rtl" : "ltr";
}

export default function TopologyChat({
  messages = [],
  onSendMessage,
  onQuickAction,
  isBusy = false
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
        <h4>Topology Chat</h4>
        <span>{sending || isBusy ? "Analyzing..." : "Ready"}</span>
      </div>

      <div className="topology-chat-feed" ref={feedRef}>
        {messages.map((msg, index) => {
          const direction = detectDirection(`${msg.content || ""} ${msg.visual_hint || ""}`);
          const quickAction = msg.action && msg.action.type ? msg.action : null;
          const quickLabel = quickAction?.label || "Apply";
          return (
            <div
              key={`${msg.role}-${index}`}
              className={`topology-chat-message ${msg.role} ${direction}`}
              dir="auto"
            >
              <div className="topology-chat-content">{msg.content}</div>
              {msg.visual_hint && <div className="topology-chat-hint">{msg.visual_hint}</div>}
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
          placeholder="Ask: why does self-intersection imply a rectangle?"
          disabled={sending || isBusy}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || isBusy || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

