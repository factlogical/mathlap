import React, { lazy, Suspense, useMemo, useState } from "react";
import { Box, Download, MessageSquare, Sparkles, Square, Sigma, Target, X } from "lucide-react";
import { useUISettings } from "../context/UISettingsContext.jsx";
import LabErrorBoundary from "../components/LabErrorBoundary.jsx";
import LabLoadingScreen from "../components/shared/LabLoadingScreen.jsx";

const LinearStudioSVG = lazy(() => import("../renderers/lab/LinearStudioSVG"));
const EpsilonDeltaRenderer = lazy(() => import("../renderers/lab/EpsilonDeltaRenderer"));
const DerivativeStudioRenderer = lazy(() => import("./DerivativeStudio/DerivativeStudioRenderer"));
const TopologyLabRenderer = lazy(() => import("./TopologyLab/TopologyLabRenderer"));

const LABS = [
  {
    id: "linear",
    label: { ar: "مختبر الجبر الخطي", en: "Linear Studio" },
    icon: Square,
    description: { ar: "تحويلات المصفوفات ومفاهيم الجبر الخطي", en: "Matrix transformations and linear algebra concepts" }
  },
  {
    id: "hypercube",
    label: { ar: "مختبر التحويل الطوبولوجي", en: "Topology 4D->3D" },
    icon: Box,
    description: { ar: "تحويل الأزواج إلى سطح طوبولوجي وهندسة التصادم", en: "Map point pairs to topology surface and collision geometry" }
  },
  {
    id: "epsilon-delta",
    label: { ar: "مختبر إبسلون-دلتا", en: "Epsilon-Delta Lab" },
    icon: Target,
    description: { ar: "استكشاف تفاعلي لتعريف النهايات", en: "Interactive exploration of limit definition" }
  },
  {
    id: "derivative-studio",
    label: { ar: "مختبر المشتقات", en: "Derivative Studio" },
    icon: Sigma,
    description: { ar: "فهم القاطع والمماس ومستوى المماس ثلاثي الأبعاد", en: "Understand secant, tangent, and tangent plane in 3D" }
  }
];

function getSafeInitialLab(initialLab) {
  const available = new Set(LABS.map((lab) => lab.id));
  if (initialLab && available.has(initialLab)) return initialLab;
  return "derivative-studio";
}

export default function MathLab({ initialLab }) {
  const { isArabic, t } = useUISettings();
  const [activeLab, setActiveLab] = useState(() => getSafeInitialLab(initialLab));
  const [showAIChat, setShowAIChat] = useState(false);

  const isStandaloneLab = activeLab === "epsilon-delta" || activeLab === "derivative-studio" || activeLab === "hypercube";

  const epsilonDeltaSpec = useMemo(
    () => ({
      type: "epsilon_delta_limit",
      concept: "limit_definition",
      data: {
        function: {
          expression: "(x^2 - 4)/(x - 2)",
          simplified: "x + 2"
        },
        point: { a: 2, L: 4 },
        domain: { x: [0, 4], y: [0, 6] },
        epsilon_delta_pairs: [
          { epsilon: 1.0, delta: 0.5 },
          { epsilon: 0.5, delta: 0.25 },
          { epsilon: 0.1, delta: 0.05 }
        ],
        discontinuity_type: "removable",
        explanation: {
          arabic: "الفكرة: كلما صغرنا ε حول L يجب اختيار δ أصغر حول a كي تبقى قيم f(x) داخل النطاق.",
          steps: [
            "نختار مسافة ε حول القيمة L.",
            "نبحث عن مسافة δ حول النقطة a.",
            "نتحقق: كل x في نطاق δ يعطي f(x) في نطاق ε."
          ]
        }
      }
    }),
    []
  );

  const handleDownload = async () => {
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const plotlyDiv = document.querySelector(".js-plotly-plot");
      if (plotlyDiv) {
        const plotlyInstance = window.Plotly;
        if (plotlyInstance && plotlyInstance.downloadImage) {
          plotlyInstance.downloadImage(plotlyDiv, {
            format: "png",
            width: 1920,
            height: 1080,
            filename: `math-lab-${activeLab}-${Date.now()}`
          });
          return;
        }
      }

      const canvas = document.querySelector("canvas");
      if (canvas) {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `math-lab-${activeLab}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }, "image/png");
      }
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const activeLabLabel = (isArabic
    ? LABS.find((lab) => lab.id === activeLab)?.label?.ar
    : LABS.find((lab) => lab.id === activeLab)?.label?.en) || t("المختبر", "Lab");

  const renderLab = () => {
    switch (activeLab) {
      case "linear":
        return (
          <div className="w-full h-full flex items-center justify-center bg-[var(--panel-2)]">
            <LinearStudioSVG matrix={[[1, 0], [0, 1]]} />
          </div>
        );
      case "hypercube":
        return <TopologyLabRenderer />;
      case "epsilon-delta":
        return <EpsilonDeltaRenderer spec={epsilonDeltaSpec} />;
      case "derivative-studio":
        return <DerivativeStudioRenderer />;
      default:
        return <div className="text-slate-300 p-4">{t("اختر مختبرًا من الأعلى.", "Choose a lab from above.")}</div>;
    }
  };

  return (
    <div className={`lab-shell-enhanced ${activeLab === "epsilon-delta" ? "epsilon-lab-active" : ""}`} dir={isArabic ? "rtl" : "ltr"}>
      <div className="lab-toolbar-enhanced">
        {LABS.map((lab) => {
          const Icon = lab.icon;
          const label = isArabic ? lab.label.ar : lab.label.en;
          const description = isArabic ? lab.description.ar : lab.description.en;
          return (
            <button
              key={lab.id}
              type="button"
              onClick={() => setActiveLab(lab.id)}
              className={`lab-module-card ${activeLab === lab.id ? "active" : ""}`}
              title={label}
            >
              <div className={`lab-module-icon ${activeLab === lab.id ? "lab-module-icon-active" : ""}`}>
                <Icon size={20} />
              </div>
              <div className="lab-module-info">
                <div className="lab-module-label">{label}</div>
                <div className="lab-module-desc">{description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="lab-stage-enhanced">
        <LabErrorBoundary resetKey={activeLab}>
          <Suspense
            fallback={
              <LabLoadingScreen
                name={activeLabLabel}
                hint={t("جاري تحميل المختبر المختار...", "Loading selected lab...")}
              />
            }
          >
            {renderLab()}
          </Suspense>
        </LabErrorBoundary>

        {!isStandaloneLab && (
          <>
            <button
              type="button"
              onClick={() => setShowAIChat((prev) => !prev)}
              className={`ai-chat-btn-redesigned ${showAIChat ? "active" : ""}`}
              title={t("إظهار/إخفاء الشات الذكي", "Toggle AI Chat")}
            >
              <div className="ai-chat-btn-icon">
                <MessageSquare size={20} />
                {showAIChat && <Sparkles size={12} className="sparkle-overlay" />}
              </div>
              <span className="ai-chat-btn-text">{t("شات ذكي", "AI Chat")}</span>
            </button>

            <button type="button" onClick={handleDownload} className="download-btn-redesigned" title={t("تنزيل الرسم", "Download image")}>
              <Download size={20} />
            </button>
          </>
        )}
      </div>

      {showAIChat && !isStandaloneLab && (
        <div className="ai-chat-box">
          <div className="ai-chat-header">
            <div className="ai-avatar-pulse">
              <Sparkles size={16} />
            </div>
            <span>{t("المساعد الذكي", "AI Assistant")}</span>
            <button
              type="button"
              onClick={() => setShowAIChat(false)}
              className="ml-auto text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>
          <div className="ai-chat-messages">
            <div className="chat-message ai">
              <div className="msg-avatar">
                <Sparkles size={12} />
              </div>
              <div className="msg-bubble">
                {t(
                  "مرحبًا، يمكنني مساعدتك في استكشاف المفاهيم الرياضية. ماذا تريد أن نعرض؟",
                  "Hi, I can help you explore math concepts. What would you like to visualize?"
                )}
              </div>
            </div>
          </div>
          <div className="ai-chat-input-area">
            <input type="text" placeholder={t("اسألني أي شيء عن الرياضيات...", "Ask me anything about math...")} className="flex-1" />
            <button type="button">
              <MessageSquare size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

