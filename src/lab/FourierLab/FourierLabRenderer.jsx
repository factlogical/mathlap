import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Gauge,
  Maximize2,
  MessageCircle,
  Minimize2,
  Music2,
  Orbit,
  Play,
  X
} from "lucide-react";
import { useUISettings } from "../../context/UISettingsContext.jsx";
import ApplicationsPanel from "./components/ApplicationsPanel";
import DrawingCanvas from "./components/DrawingCanvas";
import EpicycleCanvas from "./components/EpicycleCanvas";
import FourierChat from "./components/FourierChat";
import MathPanel from "./components/MathPanel";
import SpectrumDisplay from "./components/SpectrumDisplay";
import WaveBuilder from "./components/WaveBuilder";
import LabIntroModal from "../../components/shared/LabIntroModal";
import { FOURIER_INTRO_SLIDES } from "../../components/shared/introSlides";
import { computeComplexDFT, resamplePoints } from "./utils/dft";
import "./FourierLab.css";

const CARD_STORAGE_KEY = "fourier_cards_hidden_v1";
const INTRO_LAB_ID = "fourier";
const INTRO_SEEN_KEY = `${INTRO_LAB_ID}_intro_seen`;

const MODES = [
  { id: "draw", icon: Orbit, ar: "وضع الرسم", en: "Draw Mode" },
  { id: "builder", icon: Music2, ar: "بناء موجة", en: "Builder Mode" },
  { id: "apps", icon: Gauge, ar: "تطبيقات حقيقية", en: "Applications Mode" }
];

const MODE_CARDS = {
  draw: {
    arTitle: "ما الذي رسمته؟",
    enTitle: "What Did You Draw?",
    arText: "الرسم يتحول إلى مجموع ترددات. تقليل الترددات يعطي نسخة أبسط من الشكل الأصلي.",
    enText: "Your drawing is decomposed into frequencies. Fewer frequencies produce a simpler approximation."
  },
  builder: {
    arTitle: "معادلتك الآن",
    enTitle: "Your Equation Now",
    arText: "كل مركب جيبي تضيفه يغير شكل الموجة الكلية. هذه هي فكرة التركيب الخطي في فورييه.",
    enText: "Each sinusoidal component changes the final wave. This is Fourier linear composition."
  },
  apps: {
    arTitle: "الاستخدام الحقيقي",
    enTitle: "Real-World Use",
    arText: "الصوت والضغط وتحليل النغمات تعتمد على نفس الفكرة: تمثيل الإشارة كترددات أساسية.",
    enText: "Audio, compression, and note analysis rely on the same idea: representing a signal as frequencies."
  }
};

function loadHiddenCards() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CARD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveHiddenCards(next) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(next));
}

function nextQualityPreset(count) {
  if (count <= 16) return "low";
  if (count <= 32) return "medium";
  return "high";
}

function qualityToFreq(level, total) {
  const cap = Math.max(1, total || 1);
  if (level === "low") return Math.min(cap, 12);
  if (level === "medium") return Math.min(cap, 24);
  return Math.min(cap, 48);
}

export default function FourierLabRenderer({ embedded = false }) {
  const { isArabic, t } = useUISettings();
  const [mode, setMode] = useState("draw");
  const [coefficients, setCoefficients] = useState([]);
  const [numFreqs, setNumFreqs] = useState(24);
  const [speed, setSpeed] = useState(0.6);
  const [playing, setPlaying] = useState(true);
  const [lastAction, setLastAction] = useState("idle");
  const [hiddenCards, setHiddenCards] = useState(() => loadHiddenCards());
  const [disabledFreqIndices, setDisabledFreqIndices] = useState(() => new Set());

  const [showTopBar, setShowTopBar] = useState(true);
  const [showAssistant, setShowAssistant] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sideDock, setSideDock] = useState("right");
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(INTRO_SEEN_KEY) !== "true";
  });

  const selectedTerms = useMemo(() => {
    const count = Math.max(1, Math.min(numFreqs, coefficients.length || 1));
    return coefficients.slice(0, count).map((term, index) => ({ ...term, listIndex: index }));
  }, [coefficients, numFreqs]);

  const activeTerms = useMemo(
    () => selectedTerms.filter((term) => !disabledFreqIndices.has(term.listIndex)),
    [selectedTerms, disabledFreqIndices]
  );

  const qualityPreset = useMemo(() => nextQualityPreset(numFreqs), [numFreqs]);
  const modeCard = MODE_CARDS[mode];
  const isCardVisible = !hiddenCards[mode];

  const handleDrawingComplete = (points) => {
    const centered = points.map((p, _, arr) => ({
      x: p.x - arr[0].x,
      y: p.y - arr[0].y
    }));
    const sampled = resamplePoints(centered, 256);
    const dft = computeComplexDFT(sampled);
    setCoefficients(dft);
    setNumFreqs(Math.min(56, Math.max(12, dft.length)));
    setDisabledFreqIndices(new Set());
    setMode("draw");
    setLastAction("analyze_draw");
  };

  const handleClearDrawing = () => {
    setCoefficients([]);
    setNumFreqs(24);
    setDisabledFreqIndices(new Set());
    setLastAction("clear_draw");
  };

  const handleToggleFrequencyIndex = (index) => {
    setDisabledFreqIndices((prev) => {
      const next = new Set(prev);
      if (index + 1 > numFreqs) {
        setNumFreqs(index + 1);
        next.delete(index);
        return next;
      }
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleChatAction = (action) => {
    if (!action || typeof action !== "object") return;
    if (action.type === "set_mode" && typeof action.value === "string") {
      setMode(action.value);
      setLastAction(`set_mode:${action.value}`);
      return;
    }
    if (action.type === "adjust_freq" && Number.isFinite(action.delta)) {
      setNumFreqs((prev) => Math.max(1, Math.min(coefficients.length || 1, prev + action.delta)));
      setLastAction(`adjust_freq:${action.delta}`);
      return;
    }
    if (action.type === "set_freq" && Number.isFinite(action.value)) {
      setNumFreqs(Math.max(1, Math.min(coefficients.length || 1, Math.round(action.value))));
      setLastAction(`set_freq:${action.value}`);
      return;
    }
    if (action.type === "set_speed" && Number.isFinite(action.value)) {
      setSpeed(Math.max(0.1, Math.min(1.8, action.value)));
      setLastAction(`set_speed:${action.value}`);
      return;
    }
    if (action.type === "toggle_play") {
      setPlaying((prev) => !prev);
      setLastAction("toggle_play");
    }
  };

  const insight = useMemo(() => {
    if (!activeTerms.length) {
      return t("ابدأ بالرسم للحصول على تحليل طيفي مباشر.", "Draw first to get a live spectral analysis.");
    }
    const top = activeTerms[0];
    const total = activeTerms.reduce((s, c) => s + Math.abs(c.amplitude || 0), 0) || 1;
    const ratio = ((Math.abs(top.amplitude || 0) / total) * 100).toFixed(1);
    return t(
      `أقوى تردد مفعّل الآن هو ${top.freq} ويساهم تقريباً بـ ${ratio}% من الطاقة.`,
      `The strongest active frequency is ${top.freq}, contributing about ${ratio}% of the energy.`
    );
  }, [activeTerms, t]);

  const quickHint = useMemo(() => {
    if (mode === "draw") {
      return t(
        "جرّب زر «أضف تردداً» خطوة بخطوة لترى كيف يقترب الشكل تدريجياً.",
        "Use “Add Frequency” step-by-step to see gradual reconstruction."
      );
    }
    if (mode === "builder") {
      return t(
        "استخدم الترددات الفردية لصناعة موجة مربعة تقريبية بوضوح أعلى.",
        "Use odd harmonics to synthesize a clearer square-like wave."
      );
    }
    return t(
      "راقب تغير الجودة في الضغط واربطه بعدد الترددات المحتفظ بها.",
      "Observe compression quality versus retained frequencies."
    );
  }, [mode, t]);

  const chatContext = useMemo(
    () => ({
      mode,
      numFreqs,
      totalFreqs: coefficients.length,
      speed,
      playing,
      lastAction
    }),
    [coefficients.length, lastAction, mode, numFreqs, playing, speed]
  );

  const hideCard = () => {
    const next = { ...hiddenCards, [mode]: true };
    setHiddenCards(next);
    saveHiddenCards(next);
  };

  const resetCards = () => {
    setHiddenCards({});
    saveHiddenCards({});
  };

  const rootClass = [
    "fourier-lab",
    embedded ? "fourier-lab--embedded" : "",
    isFullscreen ? "fourier-lab--fullscreen" : "",
    sideDock === "left" ? "fourier-lab--side-left" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} dir={isArabic ? "rtl" : "ltr"}>
      {showIntro && (
        <LabIntroModal
          labId={INTRO_LAB_ID}
          slides={FOURIER_INTRO_SLIDES}
          accentColor="#06b6d4"
          isArabic={isArabic}
          onClose={() => setShowIntro(false)}
        />
      )}

      {!showTopBar && (
        <button type="button" className="fourier-top-restore" onClick={() => setShowTopBar(true)}>
          {t("إظهار الشريط العلوي", "Show Top Bar")}
        </button>
      )}

      {showTopBar && (
        <header className={`fourier-header ${embedded ? "fourier-header--compact" : ""}`}>
          {!embedded && (
            <div className="fourier-header-title">
              <h2>{t("مختبر فورييه", "Fourier Lab")}</h2>
              <p>{t("تحليل الرسم إلى ترددات وفهم التطبيقات الواقعية لفورييه.", "Analyze drawings into frequencies and understand real Fourier applications.")}</p>
            </div>
          )}

          <div className="fourier-header-tools">
            <div className="fourier-top-tabs-row">
              {MODES.map((item) => {
                const Icon = item.icon;
                const label = isArabic ? item.ar : item.en;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`fourier-tab fourier-tab--main ${mode === item.id ? "active" : ""}`}
                    onClick={() => {
                      setMode(item.id);
                      setLastAction(`set_mode:${item.id}`);
                    }}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="fourier-top-controls-row">
              <div className="fourier-quality-toggle" role="group" aria-label={t("دقة العرض", "Detail quality")}>
                <span className="fourier-quality-label">{t("الجودة", "Quality")}:</span>
                <button type="button" className={`fourier-chip-btn ${qualityPreset === "low" ? "active" : ""}`} onClick={() => setNumFreqs(qualityToFreq("low", coefficients.length))}>
                  {t("منخفضة", "Low")}
                </button>
                <button type="button" className={`fourier-chip-btn ${qualityPreset === "medium" ? "active" : ""}`} onClick={() => setNumFreqs(qualityToFreq("medium", coefficients.length))}>
                  {t("متوسطة", "Medium")}
                </button>
                <button type="button" className={`fourier-chip-btn ${qualityPreset === "high" ? "active" : ""}`} onClick={() => setNumFreqs(qualityToFreq("high", coefficients.length))}>
                  {t("عالية", "High")}
                </button>
                <button type="button" className="fourier-chip-btn fourier-chip-btn--accent" onClick={() => setNumFreqs((prev) => Math.min(Math.max(1, coefficients.length || 1), prev + 1))}>
                  <Play size={14} />
                  <span>{t("أضف تردداً", "Add Frequency")}</span>
                </button>
                <button
                  type="button"
                  className="fourier-chip-btn"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(INTRO_SEEN_KEY);
                    } catch {
                      // ignore storage failures
                    }
                    setShowIntro(true);
                  }}
                >
                  {t("إعادة عرض المقدمة", "Replay Intro")}
                </button>
              </div>

              <div className="fourier-view-actions">
                <button
                  type="button"
                  className={`fourier-icon-action ${showAssistant ? "active" : ""}`}
                  title={showAssistant ? t("إغلاق المساعد الذكي", "Hide assistant") : t("إظهار المساعد الذكي", "Show assistant")}
                  aria-label={showAssistant ? t("إغلاق المساعد الذكي", "Hide assistant") : t("إظهار المساعد الذكي", "Show assistant")}
                  onClick={() => setShowAssistant((prev) => !prev)}
                >
                  <MessageCircle size={16} />
                </button>
                <button
                  type="button"
                  className="fourier-icon-action"
                  title={sideDock === "right" ? t("نقل الأدوات إلى اليسار", "Move tools left") : t("نقل الأدوات إلى اليمين", "Move tools right")}
                  aria-label={sideDock === "right" ? t("نقل الأدوات إلى اليسار", "Move tools left") : t("نقل الأدوات إلى اليمين", "Move tools right")}
                  onClick={() => setSideDock((prev) => (prev === "right" ? "left" : "right"))}
                >
                  {sideDock === "right" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </button>
                <button
                  type="button"
                  className={`fourier-icon-action ${isFullscreen ? "active" : ""}`}
                  title={isFullscreen ? t("خروج من ملء الشاشة", "Exit fullscreen") : t("ملء الشاشة", "Fullscreen")}
                  aria-label={isFullscreen ? t("خروج من ملء الشاشة", "Exit fullscreen") : t("ملء الشاشة", "Fullscreen")}
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  className="fourier-icon-action"
                  title={t("إخفاء الشريط العلوي", "Hide top bar")}
                  aria-label={t("إخفاء الشريط العلوي", "Hide top bar")}
                  onClick={() => setShowTopBar(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {isCardVisible && (
        <section className="fourier-guide-card">
          <div className="fourier-guide-card-content">
            <strong>{isArabic ? modeCard.arTitle : modeCard.enTitle}</strong>
            <p>{isArabic ? modeCard.arText : modeCard.enText}</p>
          </div>
          <div className="fourier-guide-card-actions">
            <button type="button" className="fourier-chip-btn" onClick={resetCards}>
              {t("إعادة كل البطاقات", "Reset Cards")}
            </button>
            <button type="button" className="fourier-guide-card-close" onClick={hideCard}>
              {t("إغلاق", "Dismiss")}
            </button>
          </div>
        </section>
      )}

      <div className="fourier-body">
        <section className="fourier-content">
          {mode === "draw" && (
            <div className="fourier-draw-grid">
              <DrawingCanvas onComplete={handleDrawingComplete} onClear={handleClearDrawing} t={t} />
              <EpicycleCanvas
                coefficients={activeTerms}
                baseCount={selectedTerms.length}
                activeCount={activeTerms.length}
                speed={speed}
                playing={playing}
                onPlayToggle={() => setPlaying((prev) => !prev)}
                onSpeedChange={setSpeed}
                t={t}
              />
            </div>
          )}

          {mode === "builder" && <WaveBuilder t={t} />}
          {mode === "apps" && <ApplicationsPanel t={t} />}
        </section>

        <aside className="fourier-side">
          {mode === "draw" && (
            <>
              <MathPanel terms={activeTerms} t={t} />
              <SpectrumDisplay
                coefficients={coefficients}
                numFreqs={numFreqs}
                disabledIndices={disabledFreqIndices}
                onNumFreqsChange={setNumFreqs}
                onToggleIndex={handleToggleFrequencyIndex}
                t={t}
              />
              <section className="fourier-panel">
                <header className="fourier-panel-head">
                  <h3>{t("شرح ذكي", "Smart Insight")}</h3>
                </header>
                <p className="fourier-help-text">{insight}</p>
              </section>
            </>
          )}

          <section className="fourier-panel">
            <header className="fourier-panel-head">
              <h3>{t("ماذا أجرب الآن؟", "What To Try Next?")}</h3>
            </header>
            <p className="fourier-help-text">{quickHint}</p>
          </section>

          {showAssistant && <FourierChat context={chatContext} onAction={handleChatAction} t={t} />}
        </aside>
      </div>
    </div>
  );
}
