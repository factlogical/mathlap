import React, { useEffect, useMemo, useState } from "react";
import "./TutorialMode.css";

const STEPS = [
  {
    title: "المشكلة الأساسية",
    content:
      "بدلاً من البحث المباشر عن أربع نقاط تشكل مستطيلاً، نعيد صياغة المسألة إلى مقارنة زوجين من النقاط.",
    focus: null,
    highlight2D: null,
    highlight3D: null
  },
  {
    title: "الفكرة في 2D",
    content:
      "نبحث عن زوجين يملكان نفس المنتصف ونفس المسافة. إذا تحققا الشرطان، نحصل على مستطيل مدرج.",
    focus: "curve",
    highlight2D: "curve",
    pointers2D: [
      { x: 0.32, y: 0.5, label: "زوج 1", color: "#10b981" },
      { x: 0.7, y: 0.5, label: "زوج 2", color: "#10b981" }
    ],
    curveHint: "AI: قارن زوجين من النقاط لهما نفس midpoint ونفس distance."
  },
  {
    title: "عرض كل المستطيلات",
    content:
      "هنا يظهر معنى الخيار Show all rectangles in 2D: تشاهد التوزيع الكامل بدل مستطيل واحد فقط.",
    focus: "curve",
    highlight2D: "rectangles",
    showAllRectangles: true,
    pointers2D: [{ x: 0.5, y: 0.62, label: "Rectangle family", color: "#f59e0b" }],
    curveHint: "AI: لاحظ كثافة المستطيلات وتغيرها مع شكل المنحنى."
  },
  {
    title: "التحويل إلى 3D",
    content:
      "كل زوج نقاط يتحول إلى نقطة واحدة في الفضاء: (Mx, My, D). هكذا يتحول البحث الهندسي إلى تمثيل طوبولوجي.",
    focus: "surface",
    highlight3D: "surface",
    pointer3D: { x: 0.48, y: 0.58, label: "(Mx, My, D)", color: "#22d3ee" },
    cameraAngle: { eye: { x: 1.9, y: -1.5, z: 1.2 } },
    surfaceHint: "AI: السطح يمثل جميع الأزواج الممكنة على المنحنى."
  },
  {
    title: "التصادم يساوي مستطيل",
    content:
      "عندما تتطابق نقطتان في 3D قادمتان من زوجين مختلفين، فهذا يعني نفس المنتصف ونفس المسافة، وبالتالي مستطيل في 2D.",
    focus: "surface",
    highlight3D: "collisions",
    pointer3D: { x: 0.54, y: 0.35, label: "Collision", color: "#f59e0b" },
    cameraAngle: { eye: { x: 1.2, y: -1.0, z: 1.7 } },
    surfaceHint: "AI: النقاط البرتقالية هي مواضع الحلول المستطيلة."
  },
  {
    title: "مثال الدائرة",
    content:
      "مع الدائرة يظهر تناظر قوي. في الأعلى تكثر حالات التطابق بسبب تساوي الأقطار واشتراكها في نفس المركز.",
    focus: "surface",
    preset: "circle",
    showAllRectangles: false,
    highlight3D: "peak",
    pointer3D: { x: 0.52, y: 0.22, label: "قمة السطح", color: "#fbbf24" },
    cameraAngle: { eye: { x: 0.2, y: -0.2, z: 2.6 } },
    surfaceHint: "AI: في حالة الدائرة، التناظر يضاعف فرص التطابق."
  }
];

function normalizeStep(step) {
  if (!step) return null;
  return {
    ...step,
    pointers2D: Array.isArray(step.pointers2D) ? step.pointers2D : null
  };
}

export default function TutorialMode({ onClose, onStepChange }) {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const current = useMemo(() => normalizeStep(STEPS[step] || STEPS[0]), [step]);

  useEffect(() => {
    if (typeof onStepChange === "function") onStepChange(current);
  }, [current, onStepChange]);

  useEffect(() => {
    if (!autoPlay) return undefined;
    const timer = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= STEPS.length - 1) {
          setAutoPlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const next = () => {
    if (step >= STEPS.length - 1) {
      onClose?.();
      return;
    }
    setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const prev = () => setStep((value) => Math.max(0, value - 1));

  return (
    <section className="topology-tutorial-panel" aria-live="polite">
      <div className="topology-tutorial-panel-header">
        <div>
          <strong>العرض التعريفي التفاعلي</strong>
          <div className="topology-tutorial-panel-step">
            خطوة {step + 1} / {STEPS.length}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close tutorial">
          ×
        </button>
      </div>

      <h4>{current.title}</h4>
      <p>{current.content}</p>

      <div className="topology-tutorial-dots">
        {STEPS.map((_, index) => (
          <button
            key={`tutorial-dot-${index}`}
            type="button"
            className={index === step ? "active" : index < step ? "done" : ""}
            onClick={() => setStep(index)}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      <div className="topology-tutorial-panel-controls">
        <button type="button" onClick={prev} disabled={step === 0}>
          السابق
        </button>
        <button type="button" onClick={() => setAutoPlay((value) => !value)}>
          {autoPlay ? "إيقاف" : "تشغيل تلقائي"}
        </button>
        <button type="button" onClick={next}>
          {step >= STEPS.length - 1 ? "إنهاء" : "التالي"}
        </button>
      </div>
    </section>
  );
}
