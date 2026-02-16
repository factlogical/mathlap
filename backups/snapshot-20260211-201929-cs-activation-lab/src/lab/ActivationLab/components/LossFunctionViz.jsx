import { useEffect, useMemo, useRef, useState } from "react";
import { LOSSES } from "../utils/mathEngine";

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

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(10, rect.width);
      const h = Math.max(10, rect.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const PAD = 52;
      const xMin = 0.001;
      const xMax = 0.999;
      const keys = showAll ? Object.keys(LOSSES) : [selectedLoss];

      const allYValues = [];
      keys.forEach((key) => {
        for (let x = xMin; x <= xMax + 1e-6; x += 0.005) {
          allYValues.push(evaluateLoss(key, yTrue, x));
        }
      });
      const minY = 0;
      const maxY = Math.max(0.2, Math.min(8, Math.max(...allYValues) * 1.1));

      const toCanvas = (x, y) => ({
        cx: PAD + ((x - xMin) / (xMax - xMin)) * (w - PAD * 2),
        cy: h - PAD - ((y - minY) / (maxY - minY)) * (h - PAD * 2)
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
        ctx.strokeStyle = item.color;
        ctx.lineWidth = key === selectedLoss ? 3 : 2;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = key === selectedLoss ? 6 : 0;
        ctx.beginPath();
        let first = true;
        for (let x = xMin; x <= xMax + 1e-6; x += 0.004) {
          const y = Math.max(minY, Math.min(maxY, evaluateLoss(key, yTrue, x)));
          const { cx, cy } = toCanvas(x, y);
          if (first) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
          first = false;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      const currentY = evaluateLoss(selectedLoss, yTrue, yPred);
      const { cx: px, cy: py } = toCanvas(yPred, Math.max(minY, Math.min(maxY, currentY)));
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

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
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
