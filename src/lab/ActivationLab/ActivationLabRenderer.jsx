import { useEffect, useMemo, useState } from "react";
import ActivationChat from "./components/ActivationChat";
import { useUISettings } from "../../context/UISettingsContext.jsx";
import LabIntroModal from "../../components/shared/LabIntroModal";
import { ACTIVATION_INTRO_SLIDES } from "../../components/shared/introSlides";
import FunctionExplorer from "./components/FunctionExplorer";
import LossFunctionViz from "./components/LossFunctionViz";
import NetworkBuilder from "./components/NetworkBuilder";
import { ACTIVATIONS, LOSSES } from "./utils/mathEngine";
import { apiUrl, isOffline } from "../../config/api.js";
import "./ActivationLab.css";

const TABS = [
  { id: "explorer", label: "مستعرض الدوال" },
  { id: "builder", label: "بناء الشبكة" },
  { id: "loss", label: "دوال الخسارة" }
];

const GUIDE_STORAGE_KEY = "activation_lab_dismissed_guides_v1";
const INTRO_LAB_ID = "activation";
const INTRO_SEEN_KEY = `${INTRO_LAB_ID}_intro_seen`;

const TAB_GUIDES = {
  explorer: [
    {
      id: "explorer_overview",
      icon: "🧭",
      title: "هدف هذا العرض",
      content: "استكشف كيف تستجيب كل دالة تفعيل للمدخل z وكيف تتغير مشتقتها.",
      bullets: [
        "بدّل بين دوال التفعيل لمقارنة شكل المنحنى.",
        "حرّك منزلق z لمتابعة النقطة المميزة.",
        "فعّل المشتقة لفهم حساسية التدرج."
      ]
    }
  ],
  builder: [
    {
      id: "builder_overview",
      icon: "🧱",
      title: "هدف هذا العرض",
      content: "ابنِ خرجًا مركبًا من وحدات متعددة وحاول تقليل خطأ MSE مقابل منحنى الهدف.",
      bullets: [
        "ابدأ باختيار الدالة المستهدفة.",
        "اضبط w و b و v لكل وحدة.",
        "استخدم التحسين التلقائي كبداية ثم عدّل يدويًا."
      ]
    },
    {
      id: "builder_controls",
      icon: "🎛️",
      title: "الأدوات وما يعرضه الرسم",
      content: "كل بطاقة وحدة تتحكم بمكوّن واحد. الرسم الرئيسي يعرض الهدف والمخرج ومساهمة كل وحدة.",
      bullets: [
        "حرّك المؤشر على الرسم لرؤية القيم اللحظية.",
        "نقطة التفعيل تتغير أساسًا مع b و w.",
        "كلما انخفض MSE اقترب المخرج من الهدف."
      ]
    }
  ],
  loss: [
    {
      id: "loss_overview",
      icon: "📉",
      title: "هدف هذا العرض",
      content: "قارن دوال الخسارة تحت نفس قيم y_true و y_pred.",
      bullets: [
        "حرّك منزلقات y_true و y_pred لاختبار السلوك.",
        "فعّل المقارنة الشاملة لعرض جميع المنحنيات.",
        "راقب القيم الحية لفهم اختلاف الحساسية."
      ]
    }
  ]
};

const TAB_CONTEXT = {
  explorer: {
    goal: "الهدف: فهم شكل دالة التفعيل وسلوك التدرج.",
    tools: ["اختيار الدالة", "منزلق z", "إظهار/إخفاء المشتقة", "ملء الشاشة"]
  },
  builder: {
    goal: "الهدف: تركيب الوحدات لإنتاج منحنى يطابق الهدف.",
    tools: ["الدالة المستهدفة", "منزلقات w/b/v", "دالة تفعيل الوحدة", "تحسين تلقائي"]
  },
  loss: {
    goal: "الهدف: فهم استجابة كل دالة خسارة لخطأ التنبؤ.",
    tools: ["اختيار الخسارة", "منزلق y_true", "منزلق y_pred", "مقارنة الكل"]
  }
};

const HELP_CARDS = {
  high_mse: {
    id: "high_mse",
    icon: "⚠️",
    title: "قيمة MSE ما زالت مرتفعة",
    content: "جرّب تحريك نقاط التفعيل عبر b وتبديل نوع التفعيل لإحدى الوحدات.",
    bullets: [
      "ابدأ بوحدة مؤثرة ثم اضبط بقية الوحدات.",
      "القيمة الكبيرة لـ outW قد تبالغ في تضخيم جزء واحد من المنحنى."
    ],
    tone: "warning"
  }
};

const ACTIVATION_HELP_CARDS = {
  relu: {
    id: "tip_relu",
    icon: "🔵",
    title: "ملاحظة سريعة عن ReLU",
    content: "تعيد الصفر للقيم السالبة وتكون خطية للقيم الموجبة."
  },
  sigmoid: {
    id: "tip_sigmoid",
    icon: "🟢",
    title: "ملاحظة سريعة عن Sigmoid",
    content: "تضغط القيم إلى المجال [0,1] ومناسبة للاحتمالات لكن قد تتشبع."
  },
  tanh: {
    id: "tip_tanh",
    icon: "🟠",
    title: "ملاحظة سريعة عن Tanh",
    content: "تضغط القيم إلى المجال [-1,1] مع تمركز حول الصفر."
  },
  leaky_relu: {
    id: "tip_leaky_relu",
    icon: "🟣",
    title: "ملاحظة سريعة عن Leaky ReLU",
    content: "تحافظ على ميل صغير في الجزء السالب لتقليل ظاهرة العصبونات الميتة."
  },
  elu: {
    id: "tip_elu",
    icon: "🩷",
    title: "ملاحظة سريعة عن ELU",
    content: "الفرع السالب الناعم قد يساعد على استقرار التحديثات في بعض الحالات."
  }
};

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content:
      "مرحبًا بك في مختبر دوال التفعيل والخسارة. يمكنني شرح المفاهيم وتنفيذ الأوامر المدعومة داخل المختبر."
  }
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .trim();
}

function HelpCard({ card, onDismiss }) {
  const bullets = Array.isArray(card.bullets) ? card.bullets : [];
  return (
    <div className={`help-card ${card.tone || ""}`.trim()}>
      <span className="help-icon">{card.icon}</span>
      <div className="help-content">
        <strong>{card.title}</strong>
        <p>{card.content}</p>
        {bullets.length > 0 && (
          <ul className="help-list">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <div className="help-actions">
          <button type="button" className="help-dismiss-text" onClick={() => onDismiss(card.id)}>
            عدم العرض مجددًا
          </button>
        </div>
      </div>
      <button type="button" className="help-dismiss" onClick={() => onDismiss(card.id)} aria-label="إغلاق">
        ×
      </button>
    </div>
  );
}

export default function ActivationLabRenderer() {
  const { isArabic, t } = useUISettings();
  const [activeTab, setActiveTab] = useState("builder");
  const [selectedActivation, setSelectedActivation] = useState("relu");
  const [showDerivative, setShowDerivative] = useState(false);
  const [inputValue, setInputValue] = useState(0);
  const [selectedLoss, setSelectedLoss] = useState("mse");
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [dismissedCards, setDismissedCards] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(GUIDE_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((id) => typeof id === "string"));
    } catch {
      return new Set();
    }
  });
  const [builderMSE, setBuilderMSE] = useState(null);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(INTRO_SEEN_KEY) !== "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(Array.from(dismissedCards)));
    } catch {
      // ignore storage failures
    }
  }, [dismissedCards]);

  const dismissCard = (id) => {
    setDismissedCards((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const resetGuides = () => {
    setDismissedCards(new Set());
  };

  const replayIntro = () => {
    try {
      window.localStorage.removeItem(INTRO_SEEN_KEY);
    } catch {
      // ignore storage failures
    }
    setShowIntro(true);
  };

  const visibleCards = useMemo(() => {
    const cards = [];
    const has = (id) => !dismissedCards.has(id);

    const tabCards = TAB_GUIDES[activeTab] || [];
    tabCards.forEach((card) => {
      if (has(card.id)) cards.push(card);
    });

    if (activeTab === "explorer") {
      const activationCard = ACTIVATION_HELP_CARDS[selectedActivation];
      if (activationCard && has(activationCard.id)) cards.push(activationCard);
    }

    if (activeTab === "builder" && Number.isFinite(builderMSE) && builderMSE > 1.2 && has("high_mse")) {
      cards.push(HELP_CARDS.high_mse);
    }

    return cards;
  }, [activeTab, builderMSE, dismissedCards, selectedActivation]);

  const contextInfo = TAB_CONTEXT[activeTab] || TAB_CONTEXT.builder;

  const inferActionFromText = (text) => {
    const msg = normalizeText(text);
    if (!msg) return null;

    if ((msg.includes("hide") || msg.includes("close") || msg.includes("اخف") || msg.includes("اغلاق")) && (msg.includes("chat") || msg.includes("شات"))) {
      return { type: "set_chat_visibility", params: { show: false } };
    }
    if ((msg.includes("show") || msg.includes("open") || msg.includes("اظهر") || msg.includes("افتح")) && (msg.includes("chat") || msg.includes("شات"))) {
      return { type: "set_chat_visibility", params: { show: true } };
    }

    if (msg.includes("explorer") || msg.includes("مستعرض")) return { type: "set_tab", params: { tab: "explorer" } };
    if (msg.includes("builder") || msg.includes("شبكه") || msg.includes("شبكة")) return { type: "set_tab", params: { tab: "builder" } };
    if (msg.includes("loss") || msg.includes("خساره") || msg.includes("خسارة")) return { type: "set_tab", params: { tab: "loss" } };

    if (msg.includes("relu")) return { type: "select_activation", params: { key: "relu" } };
    if (msg.includes("sigmoid")) return { type: "select_activation", params: { key: "sigmoid" } };
    if (msg.includes("tanh")) return { type: "select_activation", params: { key: "tanh" } };
    if (msg.includes("leaky")) return { type: "select_activation", params: { key: "leaky_relu" } };
    if (msg.includes("elu")) return { type: "select_activation", params: { key: "elu" } };

    if (msg.includes("mse")) return { type: "select_loss", params: { key: "mse" } };
    if (msg.includes("mae")) return { type: "select_loss", params: { key: "mae" } };
    if (msg.includes("cross")) return { type: "select_loss", params: { key: "cross_entropy" } };
    if (msg.includes("huber")) return { type: "select_loss", params: { key: "huber" } };

    const valueMatch = msg.match(/(?:z|input|value|مدخل|قيمة)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/);
    if (valueMatch) {
      const value = Number(valueMatch[1]);
      if (Number.isFinite(value)) return { type: "set_input", params: { value } };
    }

    if ((msg.includes("derivative") || msg.includes("gradient") || msg.includes("مشتق")) && (msg.includes("hide") || msg.includes("off") || msg.includes("اخف"))) {
      return { type: "toggle_derivative", params: { show: false } };
    }
    if (msg.includes("derivative") || msg.includes("gradient") || msg.includes("مشتق")) {
      return { type: "toggle_derivative", params: { show: true } };
    }

    return null;
  };

  const applyAssistantAction = (rawAction) => {
    if (!rawAction || typeof rawAction !== "object") return false;
    const type = String(rawAction.type || "").toLowerCase();
    const params = rawAction.params && typeof rawAction.params === "object" ? rawAction.params : {};

    if (type === "set_tab" || type === "open_tab") {
      const tab = String(params.tab || "").toLowerCase();
      if (tab === "explorer" || tab === "builder" || tab === "loss") {
        setActiveTab(tab);
        return true;
      }
      return false;
    }

    if (type === "select_activation") {
      const key = String(params.key || "").toLowerCase();
      if (ACTIVATIONS[key]) {
        setSelectedActivation(key);
        setActiveTab("explorer");
        return true;
      }
      return false;
    }

    if (type === "toggle_derivative") {
      const next = Object.prototype.hasOwnProperty.call(params, "show") ? Boolean(params.show) : !showDerivative;
      setShowDerivative(next);
      setActiveTab("explorer");
      return true;
    }

    if (type === "set_input") {
      const value = Number(params.value);
      if (Number.isFinite(value)) {
        setInputValue(Math.max(-5, Math.min(5, value)));
        setActiveTab("explorer");
        return true;
      }
      return false;
    }

    if (type === "select_loss") {
      const key = String(params.key || "").toLowerCase();
      if (LOSSES[key]) {
        setSelectedLoss(key);
        setActiveTab("loss");
        return true;
      }
      return false;
    }

    if (type === "set_chat_visibility" || type === "toggle_chat") {
      const next = Object.prototype.hasOwnProperty.call(params, "show") ? Boolean(params.show) : !showChat;
      setShowChat(next);
      return true;
    }

    return false;
  };

  const sendMessage = async (text) => {
    const clean = String(text || "").trim();
    if (!clean || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: clean }]);
    setLoading(true);

    if (isOffline()) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "الشات يحتاج اتصالاً بالإنترنت." }
      ]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/interpret"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          mode: "activation_chat",
          context: {
            tab: activeTab,
            activation: selectedActivation,
            showDerivative,
            inputValue,
            loss: selectedLoss,
            builderMSE
          }
        })
      });

      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();

      const fallbackAction = inferActionFromText(clean);
      const didApply = applyAssistantAction(data.action) || applyAssistantAction(fallbackAction);

      const explanation =
        typeof data.explanation === "string" && data.explanation.trim()
          ? data.explanation
          : didApply
            ? "تم تنفيذ الأمر داخل مختبر دوال التفعيل والخسارة."
            : "لم أفهم الطلب بالكامل. جرّب صياغة أقصر.";
      const hint = typeof data.hint === "string" && data.hint.trim() ? `\n\n${data.hint}` : "";
      setMessages((prev) => [...prev, { role: "assistant", content: `${explanation}${hint}` }]);
    } catch {
      const fallbackAction = inferActionFromText(clean);
      const didApply = applyAssistantAction(fallbackAction);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: didApply
            ? "تم تنفيذ الأمر محليًا. للحصول على شرح أذكى تأكد من تشغيل الخادم على المنفذ 3002."
            : "تعذر الاتصال بالخادم. تأكد من تشغيله على المنفذ 3002."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="activation-lab">
      {showIntro && (
        <LabIntroModal
          labId={INTRO_LAB_ID}
          slides={ACTIVATION_INTRO_SLIDES}
          accentColor="#06b6d4"
          isArabic={isArabic}
          onClose={() => setShowIntro(false)}
        />
      )}
      <div className="al-header">
        <div className="al-header-info">
          <h2>{t("مختبر دوال التفعيل والخسارة", "Activation & Loss Lab")}</h2>
          <p>
            {t(
              "عروض تفاعلية لسلوك دوال التفعيل وتجميع الوحدات وحساسية دوال الخسارة.",
              "Interactive exploration of activations, unit composition, and loss sensitivity."
            )}
          </p>
        </div>
        <div className="al-header-tools">
          <button type="button" className="al-guide-reset" onClick={resetGuides}>
            {t("إعادة إظهار البطاقات", "Reset Guide Cards")}
          </button>
          <button type="button" className="al-guide-reset" onClick={replayIntro}>
            {t("إعادة عرض المقدمة", "Replay Intro")}
          </button>
          <div className="al-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`al-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="al-main" style={{ gridTemplateColumns: showChat ? "minmax(0, 1fr) 335px" : "minmax(0, 1fr)" }}>
        <div className={`al-content ${activeTab === "builder" ? "is-builder" : ""}`}>
          <div className="help-stack">
            {visibleCards.map((card) => (
              <HelpCard key={card.id} card={card} onDismiss={dismissCard} />
            ))}
          </div>

          <div className="al-context-banner" role="note">
            <span className="al-context-title">{contextInfo.goal}</span>
            <div className="al-context-chips">
              {contextInfo.tools.map((tool) => (
                <span key={tool} className="al-context-chip">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {activeTab === "explorer" && (
            <FunctionExplorer
              selected={selectedActivation}
              onSelect={setSelectedActivation}
              showDerivative={showDerivative}
              onToggleDerivative={setShowDerivative}
              inputValue={inputValue}
              onInputChange={setInputValue}
            />
          )}

          {activeTab === "builder" && <NetworkBuilder onMSEChange={setBuilderMSE} />}

          {activeTab === "loss" && <LossFunctionViz selectedLoss={selectedLoss} onSelectLoss={setSelectedLoss} />}
        </div>

        {showChat && (
          <div className="al-chat-column">
            <button type="button" className="al-chat-side-toggle" onClick={() => setShowChat(false)}>
              إخفاء الشات
            </button>
            <ActivationChat
              activeTab={activeTab}
              messages={messages}
              onSend={sendMessage}
              isLoading={loading}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>

      {!showChat && (
        <button type="button" className="al-chat-fab" onClick={() => setShowChat(true)}>
          إظهار الشات
        </button>
      )}
    </div>
  );
}
