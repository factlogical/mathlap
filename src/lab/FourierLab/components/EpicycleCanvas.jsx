import { useEffect, useRef } from "react";

function setupCanvas(canvas, targetRef) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(10, Math.floor(rect.width * dpr));
  canvas.height = Math.max(10, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  targetRef.current = { ctx, w: rect.width, h: rect.height };
}

function drawEmpty(state, text) {
  if (!state) return;
  const { ctx, w, h } = state;
  ctx.fillStyle = "#060d1e";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(148,163,184,0.72)";
  ctx.font = "500 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h / 2);
}

export default function EpicycleCanvas({
  coefficients = [],
  baseCount = 0,
  activeCount = 0,
  speed = 1,
  playing = true,
  onPlayToggle,
  onSpeedChange,
  t
}) {
  const canvasRef = useRef(null);
  const canvasStateRef = useRef(null);
  const rafRef = useRef(0);
  const pathRef = useRef([]);
  const timeRef = useRef(0);

  useEffect(() => {
    pathRef.current = [];
    timeRef.current = 0;
  }, [coefficients, baseCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    setupCanvas(canvas, canvasStateRef);
    const handleResize = () => setupCanvas(canvas, canvasStateRef);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    if (!coefficients.length) {
      drawEmpty(canvasStateRef.current, t("لا توجد إشارة نشطة بعد. فعّل الترددات أو ارسم شكلاً.", "No active signal yet. Enable frequencies or draw a shape."));
      return undefined;
    }

    let stopped = false;

    const animate = () => {
      if (stopped) return;
      const state = canvasStateRef.current;
      if (!state) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const { ctx, w, h } = state;
      ctx.fillStyle = "#060d1e";
      ctx.fillRect(0, 0, w, h);

      const centerX = w * 0.5;
      const centerY = h * 0.5;
      const list = coefficients;
      const dt = (2 * Math.PI) / Math.max(16, list.length);

      let x = centerX;
      let y = centerY;
      for (const term of list) {
        const prevX = x;
        const prevY = y;
        const angle = term.freq * timeRef.current + term.phase;
        x += term.amplitude * Math.cos(angle);
        y += term.amplitude * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(prevX, prevY, term.amplitude, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56,189,248,0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "rgba(34,211,238,0.92)";
        ctx.lineWidth = 1.35;
        ctx.stroke();
      }

      pathRef.current.unshift({ x, y });
      if (pathRef.current.length > 512) pathRef.current.pop();

      ctx.beginPath();
      pathRef.current.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 2.25;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.fill();

      if (playing) {
        // Keep default epicycle motion slower for easier visual tracking.
        timeRef.current += dt * Math.max(0.1, speed) * 0.5;
        if (timeRef.current > 2 * Math.PI) {
          timeRef.current = 0;
          pathRef.current = [];
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [coefficients, speed, playing, t]);

  return (
    <section className="fourier-panel">
      <header className="fourier-panel-head">
        <h3>{t("إعادة البناء بالدوائر", "Epicycle Reconstruction")}</h3>
        <span className="fourier-chip">
          {t("دوائر نشطة", "Active Circles")}: {activeCount}/{Math.max(activeCount, baseCount)}
        </span>
      </header>

      <div className="fourier-epicycle-toolbar">
        <button type="button" className="fourier-btn" onClick={onPlayToggle}>
          {playing ? t("إيقاف", "Pause") : t("تشغيل", "Play")}
        </button>
        <label>
          {t("السرعة", "Speed")}: {speed.toFixed(1)}x
          <input
            type="range"
            min="0.1"
            max="1.8"
            step="0.05"
            value={speed}
            onChange={(event) => onSpeedChange?.(Number(event.target.value))}
          />
        </label>
      </div>

      <canvas ref={canvasRef} className="fourier-canvas fourier-epicycle" />
    </section>
  );
}

