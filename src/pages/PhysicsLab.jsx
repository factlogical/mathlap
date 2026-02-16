import { lazy, Suspense, useEffect, useState } from "react";
import { Atom, Radio, Sparkles } from "lucide-react";
import { useUISettings } from "../context/UISettingsContext.jsx";
import LabErrorBoundary from "../components/LabErrorBoundary.jsx";
import LabLoadingScreen from "../components/shared/LabLoadingScreen.jsx";
import "./PhysicsLab.css";

const FourierLabRenderer = lazy(() => import("../lab/FourierLab/FourierLabRenderer"));

const PHYSICS_LABS = [
  {
    id: "fourier",
    icon: Radio,
    title: { ar: "مختبر فورييه", en: "Fourier Lab" },
    description: {
      ar: "تحليل الترددات وبناء الموجات مع تطبيقات واقعية مثل الصوت والضغط.",
      en: "Frequency analysis, wave synthesis, and real applications like audio and compression."
    }
  }
];

export default function PhysicsLab() {
  const { isArabic, t } = useUISettings();
  const [activeLab, setActiveLab] = useState("fourier");
  const [showIntro, setShowIntro] = useState(true);
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("physics_lab_guide_hidden") !== "1";
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 1650);
    return () => window.clearTimeout(timer);
  }, []);

  const closeGuide = () => {
    setShowGuide(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("physics_lab_guide_hidden", "1");
    }
  };

  const resetGuide = () => {
    setShowGuide(true);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("physics_lab_guide_hidden");
    }
  };

  return (
    <div className={`physics-shell ${showIntro ? "physics-shell--intro" : ""}`} dir={isArabic ? "rtl" : "ltr"}>
      <header className="physics-header">
        <div className="physics-title-wrap">
          <h2>{t("مختبر الفيزياء", "Physics Lab")}</h2>
          <p>{t("فهم الإشارات والموجات بتجارب تفاعلية مرتبطة بتطبيقات واقعية.", "Understand signals and waves through interactive real-world labs.")}</p>
        </div>

        <div className="physics-tabs">
          {PHYSICS_LABS.map((lab) => {
            const Icon = lab.icon;
            return (
              <button
                key={lab.id}
                type="button"
                className={`physics-tab ${activeLab === lab.id ? "active" : ""}`}
                onClick={() => setActiveLab(lab.id)}
              >
                <span className="physics-tab-icon">
                  <Icon size={16} />
                </span>
                <span className="physics-tab-text">
                  <strong>{isArabic ? lab.title.ar : lab.title.en}</strong>
                  <small>{isArabic ? lab.description.ar : lab.description.en}</small>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {showGuide && (
        <section className="physics-guide-card">
          <div className="physics-guide-content">
            <strong>{t("قبل البدء", "Before You Start")}</strong>
            <p>
              {t(
                "ارسم شكلاً في لوحة فورييه ثم خفّض عدد الترددات لتشاهد كيف تتغير الدقة كما في ضغط الصوت والصور.",
                "Draw a shape in Fourier mode, then reduce frequencies to see precision drop like audio/image compression."
              )}
            </p>
          </div>
          <button type="button" className="physics-guide-close" onClick={closeGuide}>
            {t("إغلاق البطاقة", "Dismiss")}
          </button>
        </section>
      )}
      {!showGuide && (
        <button type="button" className="physics-guide-restore" onClick={resetGuide}>
          {t("إظهار بطاقة الشرح", "Show Guide Card")}
        </button>
      )}

      <section className="physics-stage">
        <LabErrorBoundary resetKey={activeLab}>
          <Suspense
            fallback={
              <LabLoadingScreen
                name={t("مختبر فورييه", "Fourier Lab")}
                hint={t("جاري تحميل التجربة الفيزيائية...", "Loading physics experience...")}
              />
            }
          >
            {activeLab === "fourier" && <FourierLabRenderer embedded />}
          </Suspense>
        </LabErrorBoundary>
      </section>

      {showIntro && (
        <div
          className="physics-intro-overlay"
          onClick={() => setShowIntro(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape" || event.key === " ") {
              setShowIntro(false);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="physics-intro-logo">
            <span className="physics-intro-ring physics-intro-ring--core">
              <Atom size={28} />
            </span>
            <span className="physics-intro-ring physics-intro-ring--orbit" />
            <span className="physics-intro-wave">
              <Sparkles size={18} />
            </span>
          </div>
          <div className="physics-intro-text">
            <strong>{t("Physics Lab", "Physics Lab")}</strong>
            <small>{t("تهيئة تجربة فورييه التفاعلية...", "Preparing Fourier interactive experience...")}</small>
          </div>
        </div>
      )}
    </div>
  );
}

