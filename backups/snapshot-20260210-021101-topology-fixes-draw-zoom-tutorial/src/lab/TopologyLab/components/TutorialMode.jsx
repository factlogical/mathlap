import React, { useEffect, useMemo, useState } from "react";
import "./TutorialMode.css";

const STEPS = [
  {
    title: "المشكلة الأساسية",
    content:
      "هل كل منحنى مغلق يحتوي على 4 نقاط تشكل مستطيلاً؟\nبدل البحث المباشر عن أربع نقاط، سنحوّل المشكلة إلى تصادمات في بعد أعلى."
  },
  {
    title: "الفكرة في 2D",
    content:
      "نأخذ زوجين من النقاط على المنحنى.\nإذا كان لهما نفس المنتصف ونفس طول القطعة، فإن النقاط الأربع تكوّن مستطيلاً.",
    focus: "curve",
    curveHint: "AI: في 2D ابحث عن زوجين لهما نفس midpoint ونفس distance."
  },
  {
    title: "التحويل إلى 3D",
    content:
      "كل زوج نقاط يتحول إلى نقطة واحدة في الفضاء: (Mx, My, D).\nMx وMy إحداثيات المنتصف، وD هو طول القطعة.",
    focus: "surface",
    surfaceHint: "AI: كل نقطة في السطح تمثل زوج نقاط من المنحنى الأصلي."
  },
  {
    title: "معنى التقاطع الذاتي",
    content:
      "عندما تتطابق نقطتان في 3D آتيتان من زوجين مختلفين، فهذا تصادم.\nالتصادم يعني تحقق الشرطين الهندسيين وبالتالي وجود مستطيل.",
    focus: "surface",
    surfaceHint: "AI: النقاط البرتقالية تمثل مواقع collision على السطح."
  },
  {
    title: "تجربة سريعة",
    content:
      "جرّب منحنى figure8 أو trefoil ولاحظ تغير توزيع التصادمات.\nثم فعّل Show all rectangles in 2D للمقارنة البصرية.",
    focus: "curve",
    preset: "figure8",
    curveHint: "AI: فعّل عرض كل المستطيلات للمقارنة بين كثافة الحلول."
  }
];

export default function TutorialMode({ onClose, onStepChange }) {
  const [step, setStep] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);

  const current = useMemo(() => STEPS[step] || STEPS[0], [step]);

  useEffect(() => {
    if (typeof onStepChange !== "function") return;
    onStepChange(current);
  }, [current, onStepChange]);

  useEffect(() => {
    if (!autoPlaying) return undefined;
    const timer = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= STEPS.length - 1) {
          setAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [autoPlaying]);

  return (
    <div className="topology-tutorial-overlay" role="dialog" aria-modal="true">
      <div className="topology-tutorial-panel">
        <div className="topology-tutorial-header">
          <h3>العرض التعريفي</h3>
          <button type="button" onClick={onClose} aria-label="Close tutorial">
            ×
          </button>
        </div>

        <div className="topology-tutorial-step">
          خطوة {step + 1} من {STEPS.length}
        </div>

        <h4>{current.title}</h4>
        <div className="topology-tutorial-text">
          {current.content.split("\n").map((line, i) => (
            <p key={`line-${i}`}>{line}</p>
          ))}
        </div>

        <div className="topology-tutorial-dots">
          {STEPS.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              className={index === step ? "active" : ""}
              onClick={() => setStep(index)}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="topology-tutorial-actions">
          <button type="button" onClick={() => setStep((prev) => Math.max(0, prev - 1))} disabled={step === 0}>
            السابق
          </button>
          <button type="button" onClick={() => setAutoPlaying((v) => !v)}>
            {autoPlaying ? "إيقاف التشغيل" : "تشغيل تلقائي"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (step >= STEPS.length - 1) onClose?.();
              else setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
            }}
          >
            {step >= STEPS.length - 1 ? "إنهاء" : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}

