import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIVATIONS, generateCurveData } from "../utils/mathEngine";

const PAD = 52;
const DEFAULT_VIEW = Object.freeze({ xMin: -5, xMax: 5, yMin: -2, yMax: 2 });
const MIN_X_SPAN = 0.6;
const MAX_X_SPAN = 80;
const MIN_Y_SPAN = 0.4;
const MAX_Y_SPAN = 60;

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

function getNiceStep(span, targetLines = 10) {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const rough = span / targetLines;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  if (normalized >= 5) return 5 * power;
  if (normalized >= 2) return 2 * power;
  return power;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeView(raw) {
  const xCenter = (raw.xMin + raw.xMax) * 0.5;
  const yCenter = (raw.yMin + raw.yMax) * 0.5;
  const xSpan = clamp(Math.abs(raw.xMax - raw.xMin), MIN_X_SPAN, MAX_X_SPAN);
  const ySpan = clamp(Math.abs(raw.yMax - raw.yMin), MIN_Y_SPAN, MAX_Y_SPAN);
  return {
    xMin: xCenter - xSpan * 0.5,
    xMax: xCenter + xSpan * 0.5,
    yMin: yCenter - ySpan * 0.5,
    yMax: yCenter + ySpan * 0.5
  };
}

function strokeSmoothCurve(ctx, points) {
  if (!points.length) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].cx, points[0].cy, 1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

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

function drawGlowLine(ctx, points, color, lineWidth = 2.2, dashed = false) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = lineWidth * 2.8;
  ctx.filter = "blur(2.2px)";
  strokeSmoothCurve(ctx, points);
  ctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.filter = "none";
  strokeSmoothCurve(ctx, points);
  ctx.restore();
}

function toWorldPoint(px, py, rect, view) {
  const innerW = Math.max(1, rect.width - PAD * 2);
  const innerH = Math.max(1, rect.height - PAD * 2);
  const rx = clamp((px - PAD) / innerW, 0, 1);
  const ry = clamp((rect.height - PAD - py) / innerH, 0, 1);
  return {
    x: view.xMin + rx * (view.xMax - view.xMin),
    y: view.yMin + ry * (view.yMax - view.yMin)
  };
}

export default function FunctionExplorer({
  selected,
  onSelect,
  showDerivative,
  onToggleDerivative,
  inputValue,
  onInputChange
}) {
  const canvasRef = useRef(null);
  const viewRef = useRef(DEFAULT_VIEW);
  const panRef = useRef({
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [view, setView] = useState(DEFAULT_VIEW);
  const activation = useMemo(() => ACTIVATIONS[selected] || ACTIVATIONS.relu, [selected]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let frame = 0;

    const draw = () => {
      if (!canvas.isConnected) return;
      const { ctx, w, h } = setupCanvas(canvas);
      const currentView = normalizeView(viewRef.current);
      const xMin = currentView.xMin;
      const xMax = currentView.xMax;
      const yMin = currentView.yMin;
      const yMax = currentView.yMax;
      const xSpan = Math.max(1e-9, xMax - xMin);
      const ySpan = Math.max(1e-9, yMax - yMin);

      const toCanvas = (x, y) => ({
        cx: PAD + ((x - xMin) / xSpan) * (w - PAD * 2),
        cy: h - PAD - ((y - yMin) / ySpan) * (h - PAD * 2)
      });

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);

      const xStep = getNiceStep(xSpan, 11);
      const yStep = getNiceStep(ySpan, 9);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
        const { cx } = toCanvas(x, 0);
        ctx.beginPath();
        ctx.moveTo(cx, PAD);
        ctx.lineTo(cx, h - PAD);
        ctx.stroke();
      }
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
        const { cy } = toCanvas(0, y);
        ctx.beginPath();
        ctx.moveTo(PAD, cy);
        ctx.lineTo(w - PAD, cy);
        ctx.stroke();
      }

      if (xMin <= 0 && xMax >= 0) {
        const { cx: ox } = toCanvas(0, 0);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, PAD);
        ctx.lineTo(ox, h - PAD);
        ctx.stroke();
      }
      if (yMin <= 0 && yMax >= 0) {
        const { cy: oy } = toCanvas(0, 0);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(PAD, oy);
        ctx.lineTo(w - PAD, oy);
        ctx.stroke();
      }

      const origin = toCanvas(0, 0);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
        if (Math.abs(x) < 1e-9) continue;
        const { cx } = toCanvas(x, 0);
        if (cx < PAD - 4 || cx > w - PAD + 4) continue;
        ctx.fillText(x.toFixed(Math.abs(xStep) >= 1 ? 0 : 1), cx, origin.cy + 18);
      }
      ctx.textAlign = "right";
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
        if (Math.abs(y) < 1e-9) continue;
        const { cy } = toCanvas(0, y);
        if (cy < PAD - 4 || cy > h - PAD + 4) continue;
        ctx.fillText(y.toFixed(Math.abs(yStep) >= 1 ? 0 : 1), origin.cx - 8, cy + 4);
      }

      const sampleCount = Math.max(900, Math.floor(w * 2.8));
      const { xs, ys } = generateCurveData(activation.fn, xMin, xMax, sampleCount);
      const fnPoints = xs.map((x, i) => toCanvas(x, clamp(ys[i], yMin, yMax)));
      drawGlowLine(ctx, fnPoints, activation.color, 2.8);

      if (showDerivative) {
        const deriv = generateCurveData(activation.derivative, xMin, xMax, sampleCount);
        const derivPoints = deriv.xs.map((x, i) => toCanvas(x, clamp(deriv.ys[i], yMin, yMax)));
        drawGlowLine(ctx, derivPoints, "#fbbf24", 1.9, true);
      }

      const z = Number(inputValue);
      const a = activation.fn(z);
      const px = toCanvas(z, clamp(a, yMin, yMax)).cx;
      const py = toCanvas(z, clamp(a, yMin, yMax)).cy;

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, origin.cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(origin.cx, py);
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

      const legendItems = [{ name: activation.name, color: activation.color }];
      if (showDerivative) legendItems.push({ name: "f'(z)", color: "#fbbf24" });

      let lx = PAD + 8;
      const ly = PAD - 18;
      ctx.font = "11px sans-serif";
      legendItems.forEach((item) => {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 20, ly);
        ctx.stroke();
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(item.name, lx + 25, ly + 3);
        lx += ctx.measureText(item.name).width + 52;
      });
    };

    const scheduleDraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleDraw) : null;
    scheduleDraw();
    window.addEventListener("resize", scheduleDraw);
    resizeObserver?.observe(canvas);
    if (canvas.parentElement) resizeObserver?.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleDraw);
      resizeObserver?.disconnect();
    };
  }, [activation, inputValue, showDerivative, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    canvas.style.touchAction = "none";

    const onPointerDown = (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      const rect = canvas.getBoundingClientRect();
      panRef.current = {
        active: true,
        pointerId: event.pointerId,
        lastX: event.clientX - rect.left,
        lastY: event.clientY - rect.top
      };
      setIsPanning(true);
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      const pan = panRef.current;
      if (!pan.active || pan.pointerId !== event.pointerId) return;
      const rect = canvas.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      const dx = nextX - pan.lastX;
      const dy = nextY - pan.lastY;
      pan.lastX = nextX;
      pan.lastY = nextY;

      const current = viewRef.current;
      const innerW = Math.max(1, rect.width - PAD * 2);
      const innerH = Math.max(1, rect.height - PAD * 2);
      const worldDx = (dx / innerW) * (current.xMax - current.xMin);
      const worldDy = (dy / innerH) * (current.yMax - current.yMin);

      setView((prev) =>
        normalizeView({
          xMin: prev.xMin - worldDx,
          xMax: prev.xMax - worldDx,
          yMin: prev.yMin + worldDy,
          yMax: prev.yMax + worldDy
        })
      );
    };

    const onPointerUp = (event) => {
      const pan = panRef.current;
      if (!pan.active || pan.pointerId !== event.pointerId) return;
      panRef.current = { active: false, pointerId: null, lastX: 0, lastY: 0 };
      setIsPanning(false);
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.style.cursor = "grab";
    };

    const onWheel = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const world = toWorldPoint(pointerX, pointerY, rect, viewRef.current);
      const factor = event.deltaY > 0 ? 1.12 : 0.88;

      setView((prev) =>
        normalizeView({
          xMin: world.x + (prev.xMin - world.x) * factor,
          xMax: world.x + (prev.xMax - world.x) * factor,
          yMin: world.y + (prev.yMin - world.y) * factor,
          yMax: world.y + (prev.yMax - world.y) * factor
        })
      );
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.style.cursor = "default";
    };
  }, []);

  return (
    <section className={`function-explorer ${isFullscreen ? "is-focus-mode" : ""}`}>
      <div className="fe-topbar">
        <button type="button" className="fe-fullscreen-btn" onClick={() => setIsFullscreen((prev) => !prev)}>
          {isFullscreen ? "خروج من الملء" : "ملء شاشة المستعرض"}
        </button>
        <button type="button" className="fe-fullscreen-btn" onClick={() => setView(DEFAULT_VIEW)}>
          إعادة ضبط العرض
        </button>
      </div>

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
        <div className={`fe-canvas-wrap ${isPanning ? "is-panning" : ""}`}>
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
