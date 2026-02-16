import { useEffect, useRef, useState } from "react";

const CHART_PAD = { top: 24, right: 12, bottom: 30, left: 46 };
const OVERFIT_RATIO = 1.5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function findOverfitStart(trainHistory, testHistory) {
  const len = Math.min(trainHistory.length, testHistory.length);
  for (let i = 0; i < len; i += 1) {
    if (testHistory[i] > trainHistory[i] * OVERFIT_RATIO) {
      return i;
    }
  }
  return -1;
}

function drawLegend(ctx, width) {
  ctx.save();
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "#bcd0f4";
  ctx.fillText("Train", width - 132, 16);
  ctx.fillText("Test", width - 66, 16);

  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - 170, 12);
  ctx.lineTo(width - 138, 12);
  ctx.stroke();

  ctx.strokeStyle = "#ef4444";
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(width - 102, 12);
  ctx.lineTo(width - 70, 12);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawLine(ctx, values, color, chartW, chartH, maxY, dashed = false) {
  if (values.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  if (dashed) ctx.setLineDash([6, 3]);
  ctx.beginPath();
  values.forEach((value, index) => {
    const ratioX = index / Math.max(1, values.length - 1);
    const x = CHART_PAD.left + ratioX * chartW;
    const y = CHART_PAD.top + chartH - (value / Math.max(1e-8, maxY)) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawChart(ctx, width, height, trainHistory, testHistory, mode, hoverState) {
  const chartW = width - CHART_PAD.left - CHART_PAD.right;
  const chartH = height - CHART_PAD.top - CHART_PAD.bottom;
  const maxTrain = trainHistory.length ? Math.max(...trainHistory) : 0;
  const maxTest = testHistory.length ? Math.max(...testHistory) : 0;
  const maxRaw = Math.max(maxTrain, maxTest, 1e-6);
  const maxY = Math.max(mode === "linear" ? 0.2 : 0.6, maxRaw * 1.08);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0a1327";
  ctx.fillRect(0, 0, width, height);

  const overfitStart = findOverfitStart(trainHistory, testHistory);
  if (overfitStart >= 0 && trainHistory.length > 1) {
    const startRatio = overfitStart / Math.max(1, trainHistory.length - 1);
    const startX = CHART_PAD.left + startRatio * chartW;
    ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
    ctx.fillRect(startX, CHART_PAD.top, width - CHART_PAD.right - startX, chartH);
  }

  ctx.strokeStyle = "rgba(90, 106, 145, 0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = CHART_PAD.top + (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(CHART_PAD.left, y);
    ctx.lineTo(width - CHART_PAD.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(85, 101, 142, 0.34)";
  for (let i = 0; i <= 6; i += 1) {
    const x = CHART_PAD.left + (i / 6) * chartW;
    ctx.beginPath();
    ctx.moveTo(x, CHART_PAD.top);
    ctx.lineTo(x, height - CHART_PAD.bottom);
    ctx.stroke();
  }

  drawLine(ctx, trainHistory, "#10b981", chartW, chartH, maxY);
  drawLine(ctx, testHistory, "#ef4444", chartW, chartH, maxY, true);

  if (hoverState && Number.isFinite(hoverState.ratio)) {
    const x = CHART_PAD.left + hoverState.ratio * chartW;
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, CHART_PAD.top);
    ctx.lineTo(x, height - CHART_PAD.bottom);
    ctx.stroke();

    if (Number.isFinite(hoverState.trainValue)) {
      const y = CHART_PAD.top + chartH - (hoverState.trainValue / Math.max(1e-8, maxY)) * chartH;
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(x, y, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (Number.isFinite(hoverState.testValue)) {
      const y = CHART_PAD.top + chartH - (hoverState.testValue / Math.max(1e-8, maxY)) * chartH;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(x, y, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = "#c5d4f7";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("Loss", 10, 16);
  ctx.fillText("0", CHART_PAD.left - 12, height - CHART_PAD.bottom + 16);
  ctx.fillText(maxY.toFixed(3), 8, CHART_PAD.top + 4);
  ctx.fillText("Epoch", width - 56, height - 10);
  drawLegend(ctx, width);
}

function formatEquation(mode, linearVariant, model) {
  if (!model) return "";
  if (mode === "logistic") {
    const w1 = model.w1?.toFixed(3) ?? "0.000";
    const w2 = model.w2?.toFixed(3) ?? "0.000";
    const b = model.b?.toFixed(3) ?? "0.000";
    return `p = sigmoid(${w1}x + ${w2}y + ${b})`;
  }
  if (linearVariant === "polynomial" && Array.isArray(model.weights)) {
    return model.weights
      .map((coef, index) => {
        const value = Number(coef || 0).toFixed(3);
        if (index === 0) return `${value}`;
        if (index === 1) return `${value} * (x/5)`;
        return `${value} * (x/5)^${index}`;
      })
      .join(" + ");
  }
  const w = model.w?.toFixed(3) ?? "0.000";
  const b = model.b?.toFixed(3) ?? "0.000";
  return `y = ${w}x + ${b}`;
}

export default function LearningVisualizer({
  mode,
  linearVariant,
  model,
  history,
  testHistory = [],
  epoch,
  pointsCount,
  trainCount = pointsCount,
  testCount = 0,
  algorithm,
  lossFunction,
  isOverfitting = false,
  canManualTune = false,
  manualW = 0,
  manualB = 0,
  onManualWChange,
  onManualBChange
}) {
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const [hoverState, setHoverState] = useState(null);

  const hoverTooltip = hoverState && (Number.isFinite(hoverState.trainValue) || Number.isFinite(hoverState.testValue));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawChart(ctx, rect.width, rect.height, history, testHistory, mode, hoverState);
  }, [history, hoverState, mode, testHistory]);

  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const chartW = rect.width - CHART_PAD.left - CHART_PAD.right;
    const chartH = rect.height - CHART_PAD.top - CHART_PAD.bottom;
    if (
      localX < CHART_PAD.left ||
      localX > CHART_PAD.left + chartW ||
      localY < CHART_PAD.top ||
      localY > CHART_PAD.top + chartH
    ) {
      setHoverState(null);
      return;
    }

    const ratio = clamp((localX - CHART_PAD.left) / Math.max(1, chartW), 0, 1);
    const trainIndex = history.length ? Math.round(ratio * Math.max(0, history.length - 1)) : -1;
    const testIndex = testHistory.length ? Math.round(ratio * Math.max(0, testHistory.length - 1)) : -1;
    const trainValue = trainIndex >= 0 ? history[trainIndex] : null;
    const testValue = testIndex >= 0 ? testHistory[testIndex] : null;

    setHoverState({
      x: localX,
      y: localY,
      ratio,
      epoch: Math.round(ratio * Math.max(0, epoch)),
      trainValue: Number.isFinite(trainValue) ? trainValue : null,
      testValue: Number.isFinite(testValue) ? testValue : null
    });
  };

  const currentLoss = history.length ? history[history.length - 1] : null;
  const currentTestLoss = testHistory.length ? testHistory[testHistory.length - 1] : null;

  return (
    <section className="reglab-panel reglab-visualizer">
      <h4>Learning Visualizer</h4>
      <div className="reglab-loss-wrap" ref={canvasWrapRef}>
        <canvas
          ref={canvasRef}
          className="reglab-loss-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverState(null)}
        />
        {hoverTooltip && (
          <div
            className="reglab-loss-tooltip"
            style={{
              left: `${Math.max(8, Math.min((hoverState?.x ?? 0) + 12, 180))}px`,
              top: `${Math.max(8, (hoverState?.y ?? 0) - 8)}px`
            }}
          >
            <p>Epoch: {hoverState.epoch}</p>
            <p>Train: {Number.isFinite(hoverState.trainValue) ? hoverState.trainValue.toFixed(5) : "--"}</p>
            <p>Test: {Number.isFinite(hoverState.testValue) ? hoverState.testValue.toFixed(5) : "--"}</p>
            {Number.isFinite(hoverState.trainValue) && Number.isFinite(hoverState.testValue) && (
              <p>Gap: {(hoverState.testValue - hoverState.trainValue).toFixed(5)}</p>
            )}
          </div>
        )}
      </div>
      <div className="reglab-equation">
        <strong>Model</strong>
        {canManualTune ? (
          <>
            <div className="reglab-equation-display">
              <span className="eq-label">y =</span>
              <span className="eq-value w">{Number(manualW).toFixed(3)}</span>
              <span className="eq-label">x +</span>
              <span className="eq-value b">{Number(manualB).toFixed(3)}</span>
            </div>
            <div className="reglab-manual-control">
              <label>
                <span>w</span>
                <span className="reglab-mono">{Number(manualW).toFixed(3)}</span>
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.01"
                value={Number(manualW)}
                onChange={(event) => onManualWChange?.(Number(event.target.value))}
              />
            </div>
            <div className="reglab-manual-control">
              <label>
                <span>b</span>
                <span className="reglab-mono">{Number(manualB).toFixed(3)}</span>
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.01"
                value={Number(manualB)}
                onChange={(event) => onManualBChange?.(Number(event.target.value))}
              />
            </div>
          </>
        ) : (
          <code>{formatEquation(mode, linearVariant, model)}</code>
        )}
        <div className="reglab-equation-meta">
          <span>{algorithm}</span>
          <span>{lossFunction}</span>
        </div>
      </div>
      <div className="reglab-visualizer-stats">
        <p>
          Epoch: <span className="reglab-mono">{epoch}</span>
        </p>
        <p>
          Points: <span className="reglab-mono">{pointsCount}</span> ({trainCount}/{testCount})
        </p>
        <p>
          Train: <span className="reglab-mono">{currentLoss !== null ? currentLoss.toFixed(5) : "--"}</span>
        </p>
        <p>
          Test: <span className="reglab-mono">{currentTestLoss !== null ? currentTestLoss.toFixed(5) : "--"}</span>
        </p>
        {isOverfitting && <p className="reglab-overfit-note">Overfitting detected: test loss is much higher than train loss.</p>}
      </div>
    </section>
  );
}
