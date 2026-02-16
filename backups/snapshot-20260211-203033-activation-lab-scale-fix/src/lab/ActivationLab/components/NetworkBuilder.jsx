import { useEffect, useMemo, useRef, useState } from "react";
import { computeOutput } from "../utils/mathEngine";

const MAIN_Y_MIN = -2;
const MAIN_Y_MAX = 11;

const TARGET_FUNCTIONS = {
  piecewise: {
    name: "متعدد القطع (V-shape)",
    fn: (x) => {
      if (x < 1) return 2 + 0.5 * x;
      if (x < 2) return 2.5 - 2.5 * (x - 1);
      return 2.1 * (x - 2);
    }
  },
  sine_approx: {
    name: "تقريب الجيب",
    fn: (x) => 3 + 2.3 * Math.sin(x * 2)
  },
  step: {
    name: "دالة درجية",
    fn: (x) => (x < 1 ? 0.5 : x < 2 ? 2.6 : 4.3)
  }
};

function sampleCurves(units, targetFn, xMin, xMax, highlightUnit) {
  const xVals = [];
  const targetVals = [];
  const outputVals = [];
  const contributions = units.map(() => []);

  for (let x = xMin; x <= xMax; x += 0.01) {
    xVals.push(x);
    targetVals.push(targetFn(x));
    outputVals.push(computeOutput(x, units, "relu"));
    units.forEach((unit, i) => {
      const z = unit.w * x + unit.b;
      contributions[i].push(Math.max(0, z) * unit.outW);
    });
  }

  return {
    xVals,
    targetVals,
    outputVals,
    contributions,
    yMin: MAIN_Y_MIN,
    yMax: MAIN_Y_MAX
  };
}

export default function NetworkBuilder() {
  const [units, setUnits] = useState([
    { id: 0, w: 1, b: 0, outW: 1, label: "وحدة 0", color: "#3b82f6" },
    { id: 1, w: 1, b: -1.2, outW: 1, label: "وحدة 1", color: "#10b981" },
    { id: 2, w: 2.1, b: -4, outW: 1, label: "وحدة 2", color: "#f59e0b" }
  ]);
  const [targetFn, setTargetFn] = useState("piecewise");
  const [highlightUnit, setHighlightUnit] = useState(null);
  const mainCanvasRef = useRef(null);
  const unitCanvasRefs = useRef([]);

  const xMin = 0;
  const xMax = 3;
  const target = TARGET_FUNCTIONS[targetFn];

  const mse = useMemo(() => {
    let sum = 0;
    const steps = 120;
    for (let i = 0; i <= steps; i += 1) {
      const x = xMin + ((xMax - xMin) * i) / steps;
      const yhat = computeOutput(x, units, "relu");
      const ytrue = target.fn(x);
      sum += Math.pow(yhat - ytrue, 2);
    }
    return (sum / (steps + 1)).toFixed(4);
  }, [target, units, xMax, xMin]);

  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return undefined;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const W = Math.max(10, rect.width);
      const H = Math.max(10, rect.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const PAD = { top: 34, right: 20, bottom: 42, left: 50 };
      const pw = W - PAD.left - PAD.right;
      const ph = H - PAD.top - PAD.bottom;
      const sampled = sampleCurves(units, target.fn, xMin, xMax, highlightUnit);
      const clampY = (y) => Math.max(sampled.yMin, Math.min(sampled.yMax, y));

      const toC = (x, y) => ({
        cx: PAD.left + ((x - xMin) / (xMax - xMin)) * pw,
        cy: PAD.top + ph - ((clampY(y) - sampled.yMin) / (sampled.yMax - sampled.yMin)) * ph
      });

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = xMin; x <= xMax + 1e-6; x += 0.5) {
        const { cx } = toC(x, sampled.yMin);
        ctx.beginPath();
        ctx.moveTo(cx, PAD.top);
        ctx.lineTo(cx, H - PAD.bottom);
        ctx.stroke();
      }
      const yStep = Math.max(0.5, (sampled.yMax - sampled.yMin) / 6);
      for (let y = sampled.yMin; y <= sampled.yMax + 1e-6; y += yStep) {
        const { cy } = toC(xMin, y);
        ctx.beginPath();
        ctx.moveTo(PAD.left, cy);
        ctx.lineTo(W - PAD.right, cy);
        ctx.stroke();
      }

      const { cy: yZero } = toC(xMin, 0);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD.left, yZero);
      ctx.lineTo(W - PAD.right, yZero);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PAD.left, PAD.top);
      ctx.lineTo(PAD.left, H - PAD.bottom);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      for (let x = 0; x <= 3; x += 1) {
        const { cx } = toC(x, 0);
        ctx.fillText(String(x), cx, H - PAD.bottom + 18);
      }

      units.forEach((unit, i) => {
        if (highlightUnit !== null && highlightUnit !== i) return;
        const alpha = highlightUnit === i ? 1 : 0.36;
        ctx.strokeStyle = `${unit.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = highlightUnit === i ? 2.4 : 1.2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        sampled.xVals.forEach((x, idx) => {
          const { cx, cy } = toC(x, clampY(sampled.contributions[i][idx]));
          if (idx === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });

      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      sampled.xVals.forEach((x, idx) => {
        const { cx, cy } = toC(x, clampY(sampled.targetVals[idx]));
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2.6;
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      sampled.xVals.forEach((x, idx) => {
        const { cx, cy } = toC(x, clampY(sampled.outputVals[idx]));
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      const legend = [
        { color: "#06b6d4", label: "الهدف (Target)", dashed: false },
        { color: "#f97316", label: "المخرجات المجمعة", dashed: false },
        ...units.map((u) => ({ color: u.color, label: u.label, dashed: true }))
      ];
      let lx = PAD.left + 6;
      const ly = PAD.top + 14;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      legend.forEach((item) => {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        if (item.dashed) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 22, ly);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(item.label, lx + 28, ly + 3.5);
        lx += ctx.measureText(item.label).width + 52;
      });
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [highlightUnit, target.fn, units, xMax, xMin]);

  useEffect(() => {
    const cleanups = [];
    units.forEach((unit, i) => {
      const canvas = unitCanvasRefs.current[i];
      if (!canvas) return;

      const draw = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const W = Math.max(10, rect.width);
        const H = Math.max(10, rect.height);
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const PAD = 24;
        const pw = W - PAD * 2;
        const ph = H - PAD * 2;
        const yMin = -12;
        const yMax = 12;

        const toC = (x, y) => ({
          cx: PAD + ((x - xMin) / (xMax - xMin)) * pw,
          cy: PAD + ph - ((y - yMin) / (yMax - yMin)) * ph
        });

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        const { cy: y0 } = toC(0, 0);
        ctx.beginPath();
        ctx.moveTo(PAD, y0);
        ctx.lineTo(W - PAD, y0);
        ctx.stroke();

        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        let first = true;
        for (let x = xMin; x <= xMax + 1e-6; x += 0.02) {
          const z = unit.w * x + unit.b;
          const { cx, cy } = toC(x, Math.max(yMin, Math.min(yMax, z)));
          if (first) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
          first = false;
        }
        ctx.stroke();

        ctx.strokeStyle = unit.color;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = unit.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        first = true;
        for (let x = xMin; x <= xMax + 1e-6; x += 0.02) {
          const z = unit.w * x + unit.b;
          const a = Math.max(0, z);
          const { cx, cy } = toC(x, Math.max(yMin, Math.min(yMax, a)));
          if (first) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
          first = false;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (Math.abs(unit.w) > 1e-6) {
          const activationPoint = -unit.b / unit.w;
          if (activationPoint >= xMin && activationPoint <= xMax) {
            const { cx, cy } = toC(activationPoint, 0);
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "right";
        ctx.fillText(unit.label, W - 6, 14);
      };

      draw();
      window.addEventListener("resize", draw);
      cleanups.push(() => window.removeEventListener("resize", draw));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [units, xMax, xMin]);

  const updateUnit = (id, field, value) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: Number.parseFloat(value) } : u))
    );
  };

  return (
    <section className="network-builder">
      <div className="nb-header">
        <div>
          <label htmlFor="target-function">الدالة المستهدفة:</label>
          <select
            id="target-function"
            value={targetFn}
            onChange={(e) => setTargetFn(e.target.value)}
            className="nb-select"
          >
            {Object.entries(TARGET_FUNCTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`mse-display ${
            Number(mse) < 0.1 ? "good" : Number(mse) < 0.5 ? "ok" : "bad"
          }`}
        >
          <span>MSE</span>
          <strong>{mse}</strong>
          <span>{Number(mse) < 0.1 ? "ممتاز" : Number(mse) < 0.5 ? "مقبول" : "ضعيف"}</span>
        </div>
      </div>

      <div className="nb-body">
        <div className="nb-main-plot">
          <canvas ref={mainCanvasRef} className="nb-canvas" />
        </div>

        <div className="nb-units">
          {units.map((unit, i) => (
            <article
              key={unit.id}
              className={`unit-card ${highlightUnit === i ? "highlighted" : ""}`}
              style={{ "--unit-color": unit.color }}
              onMouseEnter={() => setHighlightUnit(i)}
              onMouseLeave={() => setHighlightUnit(null)}
            >
              <div className="unit-header">
                <span style={{ color: unit.color }}>{unit.label}</span>
                <code>
                  z={unit.w.toFixed(1)}x {unit.b >= 0 ? "+" : ""}
                  {unit.b.toFixed(1)}
                </code>
              </div>

              <canvas
                ref={(el) => {
                  unitCanvasRefs.current[i] = el;
                }}
                className="unit-canvas"
              />

              <div className="unit-sliders">
                <div className="slider-row">
                  <span>w{i + 1}</span>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={unit.w}
                    onChange={(e) => updateUnit(unit.id, "w", e.target.value)}
                  />
                  <strong>{unit.w.toFixed(1)}</strong>
                </div>
                <div className="slider-row">
                  <span>b{i + 1}</span>
                  <input
                    type="range"
                    min="-8"
                    max="2"
                    step="0.1"
                    value={unit.b}
                    onChange={(e) => updateUnit(unit.id, "b", e.target.value)}
                  />
                  <strong>{unit.b.toFixed(1)}</strong>
                </div>
                <div className="slider-row">
                  <span>v{i + 1}</span>
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.1"
                    value={unit.outW}
                    onChange={(e) => updateUnit(unit.id, "outW", e.target.value)}
                  />
                  <strong>{unit.outW.toFixed(1)}</strong>
                </div>
              </div>

              <div className="unit-status">
                {Math.abs(unit.w) < 1e-6 ? (
                  <span>
                    نقطة التفعيل: <strong>غير معرفة (w≈0)</strong>
                  </span>
                ) : (
                  <span>
                    تتفعل عند x = <strong>{(-unit.b / unit.w).toFixed(2)}</strong>
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
