import { useMemo, useState } from "react";

const PROMPTS_BY_TAB = {
  explorer: [
    "اشرح لماذا نحتاج دوال التفعيل.",
    "اختر Sigmoid.",
    "فعّل عرض المشتقة.",
    "اجعل قيمة z = 1.2"
  ],
  builder: [
    "كيف أقلل قيمة MSE؟",
    "اشرح معنى نقطة التفعيل في كل وحدة.",
    "ما الفرق بين ReLU و Tanh في التدريب؟",
    "افتح تبويب دوال الخسارة."
  ],
  loss: [
    "قارن بين MSE و MAE.",
    "متى نستخدم Cross-Entropy؟",
    "اختر Huber.",
    "افتح مستعرض الدوال."
  ]
};

export default function ActivationChat({ activeTab = "builder", messages, onSend, isLoading, onClose }) {
  const [input, setInput] = useState("");
  const quickPrompts = useMemo(() => PROMPTS_BY_TAB[activeTab] || PROMPTS_BY_TAB.builder, [activeTab]);

  const submit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
  };

  return (
    <aside className="activation-chat" dir="rtl">
      <div className="ac-header">
        <h3>شات المختبر</h3>
        <div className="ac-header-actions">
          <span className="ac-status">جاهز</span>
          <button type="button" className="ac-icon-btn close" onClick={onClose} title="إغلاق">
            ×
          </button>
        </div>
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
        {quickPrompts.map((prompt) => (
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
          placeholder="اكتب سؤالًا أو أمرًا: اختر ReLU، افتح تبويب الخسارة، فعّل المشتقة..."
        />
        <button type="button" className="ac-send" disabled={isLoading || !input.trim()} onClick={submit}>
          إرسال
        </button>
      </div>
    </aside>
  );
}
