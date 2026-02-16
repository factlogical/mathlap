import { useEffect, useMemo, useState } from "react";
import "./FourierIntro.css";
import Slide1_Portrait from "./slides/Slide1_Portrait";
import Slide2_Problem from "./slides/Slide2_Problem";
import Slide3_Equation from "./slides/Slide3_Equation";
import Slide4_Intuition from "./slides/Slide4_Intuition";
import Slide5_RealWorld from "./slides/Slide5_RealWorld";
import Slide6_Lab from "./slides/Slide6_Lab";

const INTRO_KEY = "fourier_intro_seen";

const SLIDES = [
  { id: "portrait", component: Slide1_Portrait },
  { id: "problem", component: Slide2_Problem },
  { id: "equation", component: Slide3_Equation },
  { id: "intuition", component: Slide4_Intuition },
  { id: "realworld", component: Slide5_RealWorld },
  { id: "lab", component: Slide6_Lab }
];

export default function FourierIntroModal({ onClose, t, isArabic }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animating, setAnimating] = useState(false);

  const totalSlides = SLIDES.length;
  const progressPercent = useMemo(() => {
    if (totalSlides <= 1) return 100;
    return (current / (totalSlides - 1)) * 100;
  }, [current, totalSlides]);

  const closeIntro = () => {
    try {
      window.localStorage.setItem(INTRO_KEY, "true");
    } catch {
      // ignore
    }
    onClose?.();
  };

  const goTo = (index, dir = "forward") => {
    if (animating || index < 0 || index >= totalSlides || index === current) return;
    setAnimating(true);
    setDirection(dir);
    window.setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 360);
  };

  const next = () => {
    if (current < totalSlides - 1) goTo(current + 1, "forward");
    else closeIntro();
  };

  const prev = () => {
    if (current > 0) goTo(current - 1, "backward");
  };

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") {
        closeIntro();
        return;
      }
      if (event.key === "ArrowRight") {
        if (isArabic) prev();
        else next();
      }
      if (event.key === "ArrowLeft") {
        if (isArabic) next();
        else prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, isArabic]);

  const SlideComponent = SLIDES[current].component;

  return (
    <div className="fourier-intro-overlay" dir={isArabic ? "rtl" : "ltr"}>
      <div className="fourier-intro-bg-wave" />
      <button type="button" className="fourier-intro-skip" onClick={closeIntro}>
        {t("تخطي", "Skip")}
      </button>

      <div className={`fourier-intro-slide-wrap ${direction} ${animating ? "animating" : ""}`}>
        <SlideComponent t={t} isArabic={isArabic} onNext={next} />
      </div>

      <div className="fourier-intro-progress-track">
        <div className="fourier-intro-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="fourier-intro-dots">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`fourier-intro-dot ${index === current ? "active" : ""} ${index < current ? "done" : ""}`}
            onClick={() => goTo(index, index > current ? "forward" : "backward")}
            aria-label={slide.id}
          />
        ))}
      </div>

      <div className="fourier-intro-nav">
        <button type="button" className="fourier-intro-nav-btn" onClick={prev} disabled={current === 0}>
          {t("السابق", "Previous")}
        </button>
        <button type="button" className="fourier-intro-nav-btn primary" onClick={next}>
          {current === totalSlides - 1 ? t("ابدأ الاستكشاف", "Start Exploring") : t("التالي", "Next")}
        </button>
      </div>
    </div>
  );
}
