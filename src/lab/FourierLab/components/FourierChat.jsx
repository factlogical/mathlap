import { useMemo, useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function extractNumber(text) {
  const match = String(text || "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function buildReply(text, context, t) {
  const n = normalize(text);
  if (!n) {
    return {
      response: t("اكتب سؤالك وسأشرح لك ما يحدث في الإشارة والترددات خطوة بخطوة.", "Write your question and I will explain the signal and frequency behavior step by step."),
      action: null
    };
  }

  if (n.includes("ارسم") || n.includes("draw")) {
    return {
      response: t("تم التحويل إلى وضع الرسم. ارسم شكلاً مغلقاً ثم غيّر عدد الترددات لملاحظة أثر الضغط.", "Switched to draw mode. Sketch a closed shape, then vary frequency count to observe compression."),
      action: { type: "set_mode", value: "draw" }
    };
  }
  if (n.includes("بناء") || n.includes("builder") || n.includes("موجه")) {
    return {
      response: t("تم التحويل إلى وضع بناء الموجة. ابدأ بالتردد الأساسي ثم أضف مركبات أعلى تدريجياً.", "Switched to builder mode. Start with a fundamental frequency then add higher components gradually."),
      action: { type: "set_mode", value: "builder" }
    };
  }
  if (n.includes("تطبيق") || n.includes("audio") || n.includes("compression") || n.includes("mic")) {
    return {
      response: t("تم فتح وضع التطبيقات الواقعية. جرّب الميكروفون أو خفّض الجودة لترى تأثير حذف الترددات.", "Opened real applications mode. Try microphone input or lower quality to see frequency removal impact."),
      action: { type: "set_mode", value: "apps" }
    };
  }
  if (n.includes("قلل") || n.includes("خفض")) {
    return {
      response: t("تم تقليل عدد الترددات. راقب أن الشكل يصبح أبسط لكنه أقل دقة.", "Frequency count reduced. Watch the shape become simpler but less precise."),
      action: { type: "adjust_freq", delta: -8 }
    };
  }
  if (n.includes("زد") || n.includes("ارفع")) {
    return {
      response: t("تمت زيادة الترددات. ستقترب إعادة البناء أكثر من الإشارة الأصلية.", "Frequency count increased. Reconstruction should move closer to the original signal."),
      action: { type: "adjust_freq", delta: 8 }
    };
  }
  if (n.includes("سرعه") || n.includes("speed")) {
    const value = extractNumber(n);
    if (value !== null) {
      return {
        response: t(`تم ضبط السرعة إلى ${value.toFixed(1)}x.`, `Speed set to ${value.toFixed(1)}x.`),
        action: { type: "set_speed", value }
      };
    }
    return {
      response: t("اذكر قيمة السرعة المطلوبة مثل: السرعة 1.4", "Specify target speed, for example: speed 1.4"),
      action: null
    };
  }
  if (n.includes("تردد") && /\d/.test(n)) {
    const value = extractNumber(n);
    if (value !== null) {
      return {
        response: t(`تم تعيين عدد الترددات إلى ${Math.round(value)}.`, `Frequency count set to ${Math.round(value)}.`),
        action: { type: "set_freq", value }
      };
    }
  }
  if (n.includes("اشرح") || n.includes("ما هو") || n.includes("why") || n.includes("كيف")) {
    return {
      response: t(
        "فكرة فورييه: أي إشارة معقدة يمكن تمثيلها كمجموع موجات جيبية بسيطة. السعة تحدد قوة كل تردد، والطور يحدد موقعه الزمني.",
        "Fourier idea: any complex signal can be represented as a sum of simple sinusoids. Amplitude controls strength; phase controls timing."
      ),
      action: null
    };
  }
  if (n.includes("ضغط") || n.includes("mp3") || n.includes("jpeg")) {
    return {
      response: t(
        "الضغط يعتمد على حذف الترددات الأقل تأثيراً بصرياً/سمعياً. النتيجة: حجم أصغر مقابل فقد جزئي في التفاصيل.",
        "Compression removes less important frequencies. Result: smaller size in exchange for partial detail loss."
      ),
      action: null
    };
  }

  const accuracy = context.totalFreqs > 0 ? ((context.numFreqs / context.totalFreqs) * 100).toFixed(0) : "0";
  const stateText = t(
    `الحالة الحالية: ${context.numFreqs}/${context.totalFreqs} تردد (${accuracy}%)، السرعة ${Number(context.speed || 1).toFixed(1)}x.`,
    `Current state: ${context.numFreqs}/${context.totalFreqs} frequencies (${accuracy}%), speed ${Number(context.speed || 1).toFixed(1)}x.`
  );

  return {
    response: `${stateText} ${t("جرّب: «قلّل الترددات» أو «ارفع السرعة 1.6».", `Try: "reduce frequencies" or "set speed 1.6".`)}`,
    action: null
  };
}

export default function FourierChat({ context, onAction, t }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: t(
        "مرحباً بك في مختبر فورييه. يمكنني شرح الفكرة، وتبديل الأوضاع، وضبط الترددات والسرعة مباشرة.",
        "Welcome to Fourier Lab. I can explain concepts, switch modes, and adjust frequencies/speed directly."
      )
    }
  ]);

  const quick = useMemo(
    () => [
      { label: t("وضع الرسم", "Draw"), text: "اريد وضع الرسم" },
      { label: t("وضع البناء", "Builder"), text: "انتقل الى البناء" },
      { label: t("التطبيقات", "Apps"), text: "افتح التطبيقات" },
      { label: t("قلل الترددات", "Reduce"), text: "قلل الترددات" },
      { label: t("زد الترددات", "Increase"), text: "زد الترددات" }
    ],
    [t]
  );

  const send = (presetText) => {
    const text = String(presetText ?? input).trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");

    const { response, action } = buildReply(text, context, t);
    setMessages((prev) => [...prev, { role: "assistant", text: response }]);
    if (action) onAction?.(action);
  };

  return (
    <section className="fourier-panel fourier-chat">
      <header className="fourier-panel-head">
        <h3>{t("المساعد الذكي", "Fourier Assistant")}</h3>
        <span className="fourier-chip">
          <Sparkles size={12} />
          {t("جاهز", "Ready")}
        </span>
      </header>

      <div className="fourier-chat-messages">
        {messages.map((message, idx) => (
          <div key={`${message.role}-${idx}`} className={`fourier-msg ${message.role}`}>
            <div className="fourier-msg-icon">
              <MessageCircle size={12} />
            </div>
            <div className="fourier-msg-bubble">{message.text}</div>
          </div>
        ))}
      </div>

      <div className="fourier-quick-actions">
        {quick.map((item) => (
          <button key={item.label} type="button" className="fourier-chip-btn" onClick={() => send(item.text)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="fourier-chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={t("اسأل عن فورييه أو اطلب تغييراً مباشراً...", "Ask about Fourier or request a direct action...")}
        />
        <button type="button" className="fourier-btn" onClick={() => send()}>
          {t("إرسال", "Send")}
        </button>
      </div>
    </section>
  );
}

