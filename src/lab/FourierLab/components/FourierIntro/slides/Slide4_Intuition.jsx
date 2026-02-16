import { useEffect, useRef, useState } from "react";

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(10, Math.floor(rect.width * dpr));
  canvas.height = Math.max(10, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function WavePreview({ t }) {
  const canvasRef = useRef(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((prev) => (prev < 5 ? prev + 1 : prev));
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#081328";
    ctx.fillRect(0, 0, w, h);

    const freqs = [1, 3, 5, 7, 9].slice(0, step);
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

    freqs.forEach((freq, i) => {
      ctx.strokeStyle = `${colors[i]}99`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let x = 0; x < w; x += 1) {
        const k = (x / w) * 2 * Math.PI;
        const y = h / 2 - (1 / freq) * 35 * Math.sin(freq * k);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    if (freqs.length > 0) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.8;
      ctx.shadowColor = "rgba(249,115,22,0.55)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x < w; x += 1) {
        const k = (x / w) * 2 * Math.PI;
        const y = h / 2 - freqs.reduce((sum, f) => sum + (1 / f) * 35 * Math.sin(f * k), 0);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${t("المكونات النشطة", "Active terms")}: ${freqs.length}`, 12, 18);
  }, [step, t]);

  return <canvas ref={canvasRef} className="fourier-intro-wave-canvas" />;
}

export default function Slide4_Intuition({ t }) {
  return (
    <section className="fourier-intro-slide-card">
      <h2>{t("الحدس البصري (Visual Intuition)", "Visual Intuition")}</h2>

      <p>
        {t(
          "كل موجة بسيطة تضيف تفصيلاً جديداً. ومع جمع موجات أكثر، نقترب من شكل معقد مثل الموجة المربعة.",
          "Each simple wave adds detail. Adding more waves gradually reconstructs a complex target."
        )}
      </p>

      <WavePreview t={t} />

      <p className="fourier-intro-note">
        {t("هذه هي فكرة التحليل والتركيب في فورييه خطوة بخطوة.", "This is Fourier analysis and synthesis, step by step.")}
      </p>
    </section>
  );
}
