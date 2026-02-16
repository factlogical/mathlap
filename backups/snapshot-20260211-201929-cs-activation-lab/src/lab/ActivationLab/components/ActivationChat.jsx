import { useState } from "react";

const QUICK_PROMPTS = [
  "كيف تعمل ReLU؟",
  "قارن بين Sigmoid و Tanh",
  "ما الفرق بين MSE و Cross-Entropy؟",
  "اختر Leaky ReLU"
];

export default function ActivationChat({ messages, onSend, isLoading }) {
  const [input, setInput] = useState("");

  const submit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
  };

  return (
    <aside className="activation-chat">
      <div className="ac-header">
        <h3>Activation Chat</h3>
        <span className="ac-status">Ready</span>
      </div>

      <div className="ac-messages">
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`ac-msg ${msg.role}`}>
            <div className="ac-bubble">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="ac-msg assistant">
            <div className="ac-bubble">يفكر...</div>
          </div>
        )}
      </div>

      <div className="ac-quick">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="ac-quick-btn"
            disabled={isLoading}
            onClick={() => onSend(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="ac-input-row">
        <input
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="اسأل عن التفعيل أو الخسارة..."
        />
        <button type="button" className="ac-send" disabled={isLoading || !input.trim()} onClick={submit}>
          Send
        </button>
      </div>
    </aside>
  );
}
