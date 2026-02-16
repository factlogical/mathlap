import { useState } from "react";
import ActivationChat from "./components/ActivationChat";
import FunctionExplorer from "./components/FunctionExplorer";
import LossFunctionViz from "./components/LossFunctionViz";
import NetworkBuilder from "./components/NetworkBuilder";
import { ACTIVATIONS, LOSSES } from "./utils/mathEngine";
import "./ActivationLab.css";

const TABS = [
  { id: "explorer", label: "مستعرض الدوال" },
  { id: "builder", label: "بناء الشبكة" },
  { id: "loss", label: "دوال الخسارة" }
];

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content:
      "مرحباً بك في مختبر دوال التفعيل والخسارة.\n\nجرّب:\n- كيف تعمل ReLU؟\n- قارن بين Sigmoid و Tanh\n- ما الفرق بين MSE و Cross-Entropy؟"
  }
];

export default function ActivationLabRenderer() {
  const [activeTab, setActiveTab] = useState("builder");
  const [selectedActivation, setSelectedActivation] = useState("relu");
  const [showDerivative, setShowDerivative] = useState(false);
  const [inputValue, setInputValue] = useState(0);
  const [selectedLoss, setSelectedLoss] = useState("mse");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [loading, setLoading] = useState(false);

  const applyAssistantAction = (rawAction) => {
    if (!rawAction || typeof rawAction !== "object") return;
    const type = String(rawAction.type || "").toLowerCase();
    const params = rawAction.params && typeof rawAction.params === "object" ? rawAction.params : {};

    if (type === "set_tab" || type === "open_tab") {
      const tab = String(params.tab || "").toLowerCase();
      if (tab === "explorer" || tab === "builder" || tab === "loss") setActiveTab(tab);
      return;
    }
    if (type === "select_activation") {
      const key = String(params.key || "").toLowerCase();
      if (ACTIVATIONS[key]) {
        setSelectedActivation(key);
        setActiveTab("explorer");
      }
      return;
    }
    if (type === "toggle_derivative") {
      if (Object.prototype.hasOwnProperty.call(params, "show")) {
        setShowDerivative(Boolean(params.show));
      } else {
        setShowDerivative((prev) => !prev);
      }
      setActiveTab("explorer");
      return;
    }
    if (type === "set_input") {
      const value = Number(params.value);
      if (Number.isFinite(value)) {
        const clamped = Math.max(-5, Math.min(5, value));
        setInputValue(clamped);
        setActiveTab("explorer");
      }
      return;
    }
    if (type === "select_loss") {
      const key = String(params.key || "").toLowerCase();
      if (LOSSES[key]) {
        setSelectedLoss(key);
        setActiveTab("loss");
      }
    }
  };

  const sendMessage = async (text) => {
    const clean = String(text || "").trim();
    if (!clean || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: clean }]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3002/api/interpret", {
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
            loss: selectedLoss
          }
        })
      });

      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      applyAssistantAction(data.action);

      const explanation =
        typeof data.explanation === "string" && data.explanation.trim()
          ? data.explanation
          : "لم أفهم الطلب بشكل كامل. جرّب صياغة أقصر.";
      const hint = typeof data.hint === "string" && data.hint.trim() ? `\n\n${data.hint}` : "";
      setMessages((prev) => [...prev, { role: "assistant", content: `${explanation}${hint}` }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "تعذر الاتصال بالخادم. تأكد من تشغيل server على المنفذ 3002."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="activation-lab">
      <div className="al-header">
        <div className="al-header-info">
          <h2>مختبر دوال التفعيل والخسارة</h2>
          <p>تصور تفاعلي لدوال التفعيل، تجميع الوحدات، وسلوك دوال الخسارة أثناء التعلم.</p>
        </div>
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

      <div className="al-main">
        <div className="al-content">
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
          {activeTab === "builder" && <NetworkBuilder />}
          {activeTab === "loss" && (
            <LossFunctionViz selectedLoss={selectedLoss} onSelectLoss={setSelectedLoss} />
          )}
        </div>

        <ActivationChat messages={messages} onSend={sendMessage} isLoading={loading} />
      </div>
    </div>
  );
}
