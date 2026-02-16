import React, { useEffect, useMemo, useState } from "react";
import "./TutorialMode.css";

const STEPS = [
  {
    title: "الفكرة الأساسية",
    content:
      "بدل البحث المباشر عن 4 نقاط، نبحث عن زوجين يحققان نفس المنتصف ونفس طول القطعة.",
    diagram: "pairs"
  },
  {
    title: "التفسير على منحنى 2D",
    content:
      "النقاط المعلّمة في 2D تمثل أزواجًا مرشحة. إذا تساوى midpoint وdistance لزوجين نحصل على مستطيل.",
    focus: "curve",
    pointer: { x: 66, y: 52, label: "زوجان مرشحان" },
    curveHint: "AI: راقب الأزواج التي تشترك في midpoint وطول القطعة.",
    diagram: "rectangle"
  },
  {
    title: "التحويل إلى 3D",
    content:
      "كل زوج نقاط على المنحنى يتحول إلى نقطة واحدة: (Mx, My, D). هنا تبدأ الصورة الطوبولوجية.",
    focus: "surface",
    pointer: { x: 48, y: 62, label: "(Mx, My, D)" },
    surfaceHint: "AI: كل نقطة على السطح تمثل زوج نقاط من 2D.",
    diagram: "lift"
  },
  {
    title: "التصادم = مستطيل",
    content:
      "عند تقاطع نقطتين من زوجين مختلفين في 3D فهذا يعني نفس المنتصف ونفس الطول، وبالتالي مستطيل في 2D.",
    focus: "surface",
    pointer: { x: 50, y: 36, label: "Collision" },
    surfaceHint: "AI: النقطة البرتقالية هنا تعني حلًا مستطيليًا على المنحنى.",
    diagram: "collision"
  },
  {
    title: "تجربة عملية",
    content:
      "الآن قارن بين المنحنيات (مثل figure8 وtrefoil) مع تفعيل Show all rectangles in 2D.",
    focus: "curve",
    pointer: { x: 72, y: 48, label: "قارن الكثافة" },
    preset: "figure8",
    curveHint: "AI: فعّل عرض كل المستطيلات للمقارنة البصرية المباشرة.",
    diagram: "compare"
  }
];

function getTargetSelector(focus) {
  if (focus === "surface") return ".topology-pane-3d";
  if (focus === "curve") return ".topology-pane-2d";
  return null;
}

function MiniDiagram({ type }) {
  if (type === "lift") {
    return (
      <svg viewBox="0 0 210 70" className="topology-tutorial-svg" aria-hidden="true">
        <path d="M10 52 C48 12, 82 10, 108 34 C136 58, 164 56, 198 18" />
        <line x1="56" y1="44" x2="130" y2="24" className="accent" />
        <circle cx="56" cy="44" r="3" />
        <circle cx="130" cy="24" r="3" />
        <text x="146" y="24">(Mx,My,D)</text>
      </svg>
    );
  }
  if (type === "collision") {
    return (
      <svg viewBox="0 0 210 70" className="topology-tutorial-svg" aria-hidden="true">
        <path d="M8 52 C46 20, 76 8, 106 28 C126 42, 156 48, 202 24" />
        <path d="M8 24 C44 44, 74 56, 106 28 C136 8, 166 20, 202 52" className="accent" />
        <circle cx="106" cy="28" r="4" className="warn" />
        <text x="118" y="31">collision</text>
      </svg>
    );
  }
  if (type === "rectangle") {
    return (
      <svg viewBox="0 0 210 70" className="topology-tutorial-svg" aria-hidden="true">
        <rect x="56" y="18" width="92" height="36" />
        <line x1="56" y1="18" x2="148" y2="54" className="accent" />
        <line x1="148" y1="18" x2="56" y2="54" className="accent" />
        <circle cx="102" cy="36" r="3" className="warn" />
        <text x="110" y="38">same midpoint</text>
      </svg>
    );
  }
  if (type === "compare") {
    return (
      <svg viewBox="0 0 210 70" className="topology-tutorial-svg" aria-hidden="true">
        <path d="M10 52 C44 16, 72 16, 106 52 C140 16, 168 16, 202 52" />
        <path d="M10 26 C42 50, 76 10, 106 36 C136 58, 166 20, 202 44" className="accent" />
        <text x="12" y="14">figure8 vs trefoil</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 210 70" className="topology-tutorial-svg" aria-hidden="true">
      <path d="M10 52 C48 12, 82 10, 108 34 C136 58, 164 56, 198 18" />
      <line x1="52" y1="44" x2="124" y2="22" className="accent" />
      <line x1="124" y1="22" x2="176" y2="44" className="accent" />
      <text x="130" y="16">pair condition</text>
    </svg>
  );
}

export default function TutorialMode({ onClose, onStepChange }) {
  const [step, setStep] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });

  const current = useMemo(() => STEPS[step] || STEPS[0], [step]);

  useEffect(() => {
    if (typeof onStepChange === "function") onStepChange(current);
  }, [current, onStepChange]);

  useEffect(() => {
    const updateAnchor = () => {
      const host = document.querySelector(".topology-lab");
      if (!host) return;
      const hostRect = host.getBoundingClientRect();
      setHostSize({
        width: hostRect.width,
        height: hostRect.height
      });

      const selector = getTargetSelector(current.focus);
      if (!selector) {
        setAnchor(null);
        return;
      }
      const target = host.querySelector(selector);
      if (!target) {
        setAnchor(null);
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const px = Number.isFinite(current.pointer?.x) ? current.pointer.x : 50;
      const py = Number.isFinite(current.pointer?.y) ? current.pointer.y : 50;

      setAnchor({
        x: targetRect.left - hostRect.left + (targetRect.width * px) / 100,
        y: targetRect.top - hostRect.top + (targetRect.height * py) / 100,
        label: current.pointer?.label || ""
      });
    };

    updateAnchor();
    window.addEventListener("resize", updateAnchor);

    const host = document.querySelector(".topology-lab");
    const observer = host && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateAnchor)
      : null;
    if (observer && host) observer.observe(host);

    return () => {
      window.removeEventListener("resize", updateAnchor);
      observer?.disconnect();
    };
  }, [current]);

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
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoPlaying]);

  const dockAnchor = useMemo(() => {
    const x = Math.max(40, Math.min(hostSize.width - 40, hostSize.width * 0.18));
    const y = Math.max(40, Math.min(hostSize.height - 40, hostSize.height - 72));
    return { x, y };
  }, [hostSize.height, hostSize.width]);

  return (
    <div className="topology-tutorial-overlay" aria-live="polite">
      {anchor && (
        <>
          <svg className="topology-tutorial-guide" viewBox={`0 0 ${hostSize.width || 1} ${hostSize.height || 1}`}>
            <path
              d={`M ${dockAnchor.x} ${dockAnchor.y} C ${dockAnchor.x + 70} ${dockAnchor.y - 40}, ${anchor.x - 60} ${anchor.y + 35}, ${anchor.x} ${anchor.y}`}
            />
          </svg>
          <div className="topology-tutorial-pointer" style={{ left: `${anchor.x}px`, top: `${anchor.y}px` }}>
            <span className="ring outer" />
            <span className="ring inner" />
            <span className="dot" />
            {anchor.label && <span className="tag">{anchor.label}</span>}
          </div>
        </>
      )}

      <div className="topology-tutorial-dock">
        <div className="topology-tutorial-header">
          <strong>العرض التعريفي</strong>
          <button type="button" onClick={onClose} aria-label="Close tutorial">
            ×
          </button>
        </div>

        <div className="topology-tutorial-step">خطوة {step + 1} / {STEPS.length}</div>
        <h4>{current.title}</h4>
        <p>{current.content}</p>
        <MiniDiagram type={current.diagram} />

        <div className="topology-tutorial-controls">
          <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0}>
            السابق
          </button>
          <button type="button" onClick={() => setAutoPlaying((v) => !v)}>
            {autoPlaying ? "إيقاف" : "تشغيل تلقائي"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (step >= STEPS.length - 1) onClose?.();
              else setStep((v) => Math.min(STEPS.length - 1, v + 1));
            }}
          >
            {step >= STEPS.length - 1 ? "إنهاء" : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}

