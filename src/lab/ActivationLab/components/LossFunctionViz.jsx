import { useEffect, useMemo, useRef, useState } from "react";
import { LOSSES } from "../utils/mathEngine";

const LOSS_X_MIN = 0.001;
const LOSS_X_MAX = 0.999;
const LOSS_Y_MIN = 0;
const LOSS_Y_MAX = 8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(10, Math.floor(rect.width));
  const h = Math.max(10, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { ctx, w, h };
}

function strokeSmoothCurve(ctx, points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].cx, points[0].cy);
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].cx + points[i + 1].cx) / 2;
    const midY = (points[i].cy + points[i + 1].cy) / 2;
    ctx.quadraticCurveTo(points[i].cx, points[i].cy, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.cx, last.cy);
  ctx.stroke();
}

function drawGlowLine(ctx, points, color, lineWidth = 2) {
  ctx.save();
  ctx.strokeStyle = `${color}44`;
  ctx.lineWidth = lineWidth * 2.6;
  ctx.filter = "blur(2px)";
  strokeSmoothCurve(ctx, points);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.filter = "none";
  strokeSmoothCurve(ctx, points);
  ctx.restore();
}

function evaluateLoss(lossKey, y, yhat) {
  const loss = LOSSES[lossKey] || LOSSES.mse;
  if (lossKey === "huber") return loss.fn(y, yhat, 0.4);
  return loss.fn(y, yhat);
}

export default function LossFunctionViz({ selectedLoss, onSelectLoss }) {
  const [yTrue, setYTrue] = useState(1);
  const [yPred, setYPred] = useState(0.2);
  const [showAll, setShowAll] = useState(true);
  const canvasRef = useRef(null);

  const selected = LOSSES[selectedLoss] || LOSSES.mse;

  const liveValues = useMemo(
    () =>
      Object.entries(LOSSES).map(([key, item]) => ({
        key,
        name: item.name,
        color: item.color,
        value: evaluateLoss(key, yTrue, yPred)
      })),
    [yPred, yTrue]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let frame = 0;

    const draw = () => {
      const { ctx, w, h } = setupCanvas(canvas);

      const PAD = 52;
      const xMin = LOSS_X_MIN;
      const xMax = LOSS_X_MAX;
      const keys = showAll ? Object.keys(LOSSES) : [selectedLoss];
      const minY = LOSS_Y_MIN;
      const maxY = LOSS_Y_MAX;
      const clampY = (y) => clamp(y, minY, maxY);

      const toCanvas = (x, y) => ({
        cx: PAD + ((x - xMin) / (xMax - xMin)) * (w - PAD * 2),
        cy: h - PAD - ((clampY(y) - minY) / (maxY - minY)) * (h - PAD * 2)
      });

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x <= 1.0001; x += 0.1) {
        const { cx } = toCanvas(x, minY);
        ctx.beginPath();
        ctx.moveTo(cx, PAD);
        ctx.lineTo(cx, h - PAD);
        ctx.stroke();
      }
      for (let y = minY; y <= maxY + 1e-6; y += maxY / 5) {
        const { cy } = toCanvas(xMin, y);
        ctx.beginPath();
        ctx.moveTo(PAD, cy);
        ctx.lineTo(w - PAD, cy);
        ctx.stroke();
      }

      const { cy: y0 } = toCanvas(xMin, 0);
      const { cx: x0 } = toCanvas(0, minY);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, y0);
      ctx.lineTo(w - PAD, y0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, PAD);
      ctx.lineTo(x0, h - PAD);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      for (let x = 0; x <= 1.0001; x += 0.2) {
        const { cx } = toCanvas(x, minY);
        ctx.fillText(x.toFixed(1), cx, h - PAD + 18);
      }
      ctx.textAlign = "right";
      for (let y = 0; y <= maxY + 1e-6; y += maxY / 5) {
        const { cy } = toCanvas(xMin, y);
        ctx.fillText(y.toFixed(2), x0 - 8, cy + 3);
      }

      keys.forEach((key) => {
        const item = LOSSES[key];
        const points = [];
        for (let x = xMin; x <= xMax + 1e-6; x += 0.004) {
          const y = clampY(evaluateLoss(key, yTrue, x));
          points.push(toCanvas(x, y));
        }
        drawGlowLine(ctx, points, item.color, key === selectedLoss ? 2.8 : 1.9);
      });

      const currentY = evaluateLoss(selectedLoss, yTrue, yPred);
      const { cx: px, cy: py } = toCanvas(yPred, clampY(currentY));
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`L=${currentY.toFixed(4)}`, px + 10, py - 8);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("yhat", w / 2, h - 8);
    };

    const scheduleDraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleDraw) : null;

    scheduleDraw();
    window.addEventListener("resize", scheduleDraw);
    resizeObserver?.observe(canvas);
    if (canvas.parentElement) resizeObserver?.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleDraw);
      resizeObserver?.disconnect();
    };
  }, [selectedLoss, showAll, yPred, yTrue]);

  return (
    <section className="loss-viz">
      <div className="lv-selector">
        {Object.entries(LOSSES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            className={`lv-btn ${selectedLoss === key ? "active" : ""}`}
            style={{ "--color": item.color }}
            onClick={() => onSelectLoss(key)}
          >
            <strong>{item.name}</strong>
            <code>{item.formula}</code>
          </button>
        ))}
      </div>

      <div className="lv-layout">
        <div className="lv-canvas-wrap">
          <canvas ref={canvasRef} className="lv-canvas" />
        </div>

        <div className="lv-side">
          <div className="fe-info-card">
            <h4 style={{ color: selected.color }}>{selected.name}</h4>
            <code className="formula-display">{selected.formula}</code>
            <p>{selected.description}</p>
          </div>

          <div className="control-group">
            <label>
              الحقيقة y = <strong style={{ color: "#fbbf24" }}>{yTrue.toFixed(2)}</strong>
            </label>
            <input
              className="styled-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={yTrue}
              onChange={(e) => setYTrue(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>
              التوقع ŷ = <strong style={{ color: selected.color }}>{yPred.toFixed(2)}</strong>
            </label>
            <input
              className="styled-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={yPred}
              onChange={(e) => setYPred(parseFloat(e.target.value))}
            />
          </div>

          <label className="toggle-row">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            <span>عرض كل الدوال للمقارنة</span>
          </label>

          <div className="lv-metrics">
            {liveValues.map((item) => (
              <div key={item.key} className={`lv-metric ${selectedLoss === item.key ? "active" : ""}`}>
                <span>{item.name}</span>
                <strong style={{ color: item.color }}>{item.value.toFixed(4)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
