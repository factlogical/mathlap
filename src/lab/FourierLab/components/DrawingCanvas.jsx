import { useEffect, useRef, useState } from "react";
import { Circle, Eraser, Pencil, Sparkles, Star } from "lucide-react";

const MIN_POINTS = 16;

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(10, Math.floor(rect.width * dpr));
  canvas.height = Math.max(10, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { ctx, w: rect.width, h: rect.height };
}

function drawGrid(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#08142a");
  grad.addColorStop(1, "#050d1d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(148,163,184,0.12)";
  ctx.lineWidth = 1;
  const step = 30;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(148,163,184,0.38)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

function drawPath(ctx, points, w, h) {
  if (!points.length) {
    ctx.fillStyle = "rgba(160,180,204,0.85)";
    ctx.font = "500 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Draw inside the canvas", w / 2, h / 2);
    return;
  }

  ctx.strokeStyle = "#22d3ee";
  ctx.shadowColor = "rgba(34, 211, 238, 0.35)";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i += 1) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function generateCircle(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.28;
  const pts = [];
  for (let i = 0; i < 220; i += 1) {
    const t = (i / 219) * Math.PI * 2;
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return pts;
}

function generateStar(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const outer = Math.min(w, h) * 0.32;
  const inner = outer * 0.45;
  const anchors = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (-Math.PI / 2) + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    anchors.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  anchors.push(anchors[0]);

  const pts = [];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    for (let s = 0; s < 18; s += 1) {
      const t = s / 18;
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return pts;
}

export default function DrawingCanvas({ onComplete, onClear, t }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef([]);
  const [points, setPoints] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    pointsRef.current = points;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas);
    drawGrid(ctx, w, h);
    drawPath(ctx, points, w, h);
  }, [points]);

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { ctx, w, h } = setupCanvas(canvas);
      drawGrid(ctx, w, h);
      drawPath(ctx, pointsRef.current, w, h);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const getLocalPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const begin = (event) => {
    const p = getLocalPoint(event);
    drawingRef.current = true;
    setPoints([p]);
    setStatus("");
  };

  const move = (event) => {
    if (!drawingRef.current) return;
    const p = getLocalPoint(event);
    setPoints((prev) => {
      if (!prev.length) return [p];
      const last = prev[prev.length - 1];
      if (Math.hypot(last.x - p.x, last.y - p.y) < 2.5) return prev;
      return [...prev, p];
    });
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const current = pointsRef.current;
    if (current.length < MIN_POINTS) {
      setStatus(t("الرسم قصير جداً، ارسم مساراً أطول.", "Drawing is too short, draw a longer stroke."));
      return;
    }
    onComplete?.(current);
    setStatus(t("تم تحليل الرسم. يمكنك الآن تجربة تغيير عدد الترددات.", "Drawing analyzed. You can now tune frequency count."));
  };

  const handleClear = () => {
    setPoints([]);
    pointsRef.current = [];
    setStatus("");
    onClear?.();
  };

  const handlePreset = (kind) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = setupCanvas(canvas);
    const generated = kind === "star" ? generateStar(w, h) : generateCircle(w, h);
    setPoints(generated);
    pointsRef.current = generated;
    onComplete?.(generated);
    setStatus(t("تم تحميل شكل جاهز وتحليله مباشرة.", "A preset shape was loaded and analyzed."));
  };

  return (
    <section className="fourier-panel fourier-drawing">
      <header className="fourier-panel-head">
        <h3>{t("لوحة الرسم", "Drawing Canvas")}</h3>
        <div className="fourier-btn-row">
          <button type="button" className="fourier-btn" onClick={() => handlePreset("circle")}>
            <Circle size={15} />
            <span>{t("دائرة", "Circle")}</span>
          </button>
          <button type="button" className="fourier-btn" onClick={() => handlePreset("star")}>
            <Star size={15} />
            <span>{t("نجمة", "Star")}</span>
          </button>
          <button type="button" className="fourier-btn danger" onClick={handleClear}>
            <Eraser size={15} />
            <span>{t("مسح", "Clear")}</span>
          </button>
        </div>
      </header>

      <div className="fourier-drawing-hint">
        <Pencil size={14} />
        <span>{t("ارسم شكلاً حراً ثم ارفع المؤشر لتحليل الترددات.", "Draw a free shape, then release pointer to analyze frequencies.")}</span>
        <span className="fourier-chip">
          <Sparkles size={12} />
          {t("النقاط", "Points")}: {points.length}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        className="fourier-canvas"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />

      <div className="fourier-status">{status}</div>
    </section>
  );
}

