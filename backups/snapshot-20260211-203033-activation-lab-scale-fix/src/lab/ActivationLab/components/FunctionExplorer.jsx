import { useEffect, useMemo, useRef } from "react";
import { ACTIVATIONS, generateCurveData } from "../utils/mathEngine";

export default function FunctionExplorer({
  selected,
  onSelect,
  showDerivative,
  onToggleDerivative,
  inputValue,
  onInputChange
}) {
  const canvasRef = useRef(null);
  const activation = useMemo(() => ACTIVATIONS[selected] || ACTIVATIONS.relu, [selected]);

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
      const xMin = -5;
      const xMax = 5;
      const yMin = -2;
      const yMax = 2;

      const toCanvas = (x, y) => ({
        cx: PAD + ((x - xMin) / (xMax - xMin)) * (w - PAD * 2),
        cy: h - PAD - ((y - yMin) / (yMax - yMin)) * (h - PAD * 2)
      });

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = xMin; x <= xMax; x += 1) {
        const { cx } = toCanvas(x, 0);
        ctx.beginPath();
        ctx.moveTo(cx, PAD);
        ctx.lineTo(cx, h - PAD);
        ctx.stroke();
      }
      for (let y = yMin; y <= yMax; y += 0.5) {
        const { cy } = toCanvas(0, y);
        ctx.beginPath();
        ctx.moveTo(PAD, cy);
        ctx.lineTo(w - PAD, cy);
        ctx.stroke();
      }

      const { cx: ox, cy: oy } = toCanvas(0, 0);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, oy);
      ctx.lineTo(w - PAD, oy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, PAD);
      ctx.lineTo(ox, h - PAD);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      for (let x = xMin; x <= xMax; x += 1) {
        if (x === 0) continue;
        const { cx } = toCanvas(x, 0);
        ctx.fillText(String(x), cx, oy + 18);
      }

      ctx.textAlign = "right";
      for (let y = yMin; y <= yMax; y += 0.5) {
        if (Math.abs(y) < 0.001) continue;
        const { cy } = toCanvas(0, y);
        ctx.fillText(y.toFixed(1), ox - 8, cy + 4);
      }

      const { xs, ys } = generateCurveData(activation.fn, xMin, xMax, 420);
      ctx.strokeStyle = activation.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = activation.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      xs.forEach((x, i) => {
        const y = Math.max(yMin, Math.min(yMax, ys[i]));
        const { cx, cy } = toCanvas(x, y);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (showDerivative) {
        const deriv = generateCurveData(activation.derivative, xMin, xMax, 420);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        deriv.xs.forEach((x, i) => {
          const y = Math.max(yMin, Math.min(yMax, deriv.ys[i]));
          const { cx, cy } = toCanvas(x, y);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const z = Number(inputValue);
      const a = activation.fn(z);
      const clamped = Math.max(yMin, Math.min(yMax, a));
      const { cx: px, cy: py } = toCanvas(z, clamped);

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, oy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, py);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`z=${z.toFixed(2)} -> a=${a.toFixed(4)}`, px + 10, py - 10);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [activation, inputValue, showDerivative]);

  return (
    <section className="function-explorer">
      <div className="fe-selector">
        {Object.entries(ACTIVATIONS).map(([key, act]) => (
          <button
            key={key}
            type="button"
            className={`fe-btn ${selected === key ? "active" : ""}`}
            style={{ "--color": act.color }}
            onClick={() => onSelect(key)}
          >
            <span className="btn-name">{act.name}</span>
            <code className="btn-formula">{act.formula}</code>
          </button>
        ))}
      </div>

      <div className="fe-body">
        <div className="fe-canvas-wrap">
          <canvas ref={canvasRef} className="fe-canvas" />
        </div>

        <div className="fe-controls">
          <div className="fe-info-card">
            <h4 style={{ color: activation.color }}>{activation.name}</h4>
            <code className="formula-display">{activation.formula}</code>
            <p>{activation.description}</p>
          </div>

          <div className="control-group">
            <label>
              المدخل z = <strong style={{ color: "#fbbf24" }}>{Number(inputValue).toFixed(2)}</strong>
            </label>
            <input
              className="styled-slider"
              type="range"
              min="-5"
              max="5"
              step="0.01"
              value={inputValue}
              onChange={(e) => onInputChange(parseFloat(e.target.value))}
            />
          </div>

          <div className="output-display">
            <div className="output-row">
              <span>المدخل z</span>
              <strong>{Number(inputValue).toFixed(4)}</strong>
            </div>
            <div className="output-row">
              <span>المخرج a</span>
              <strong style={{ color: activation.color }}>{activation.fn(Number(inputValue)).toFixed(4)}</strong>
            </div>
            {showDerivative && (
              <div className="output-row">
                <span>المشتقة f'(z)</span>
                <strong style={{ color: "#fbbf24" }}>{activation.derivative(Number(inputValue)).toFixed(4)}</strong>
              </div>
            )}
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={showDerivative}
              onChange={(e) => onToggleDerivative(e.target.checked)}
            />
            <span>عرض المشتقة (باللون الأصفر)</span>
          </label>
        </div>
      </div>
    </section>
  );
}
