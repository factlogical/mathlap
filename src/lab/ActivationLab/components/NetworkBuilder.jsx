import { useEffect, useMemo, useRef, useState } from "react";
import { computeOutput, computeUnit } from "../utils/mathEngine";

const MAIN_Y_MIN = -0.5;
const MAIN_Y_MAX = 6.5;
const MAIN_PAD = { top: 34, right: 20, bottom: 42, left: 52 };
const MIN_VIEW_X_SPAN = 0.5;
const MAX_VIEW_X_SPAN = 40;
const MIN_VIEW_Y_SPAN = 0.6;
const MAX_VIEW_Y_SPAN = 40;
const ACTIVATION_CHOICES = ["relu", "sigmoid", "tanh", "leaky_relu"];
const PARAM_LIMITS = {
  w: [-8, 8],
  b: [-30, 12],
  outW: [-6, 6]
};

const BASE_UNITS = [
  { id: 0, w: 1.0, b: 0.0, outW: 1.0, activation: "relu", label: "وحدة 0", color: "#3b82f6" },
  { id: 1, w: 1.0, b: -1.2, outW: 1.0, activation: "relu", label: "وحدة 1", color: "#10b981" },
  { id: 2, w: 2.1, b: -4.0, outW: 1.0, activation: "relu", label: "وحدة 2", color: "#f59e0b" }
];

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
    fn: (x) => 3 + 2.2 * Math.sin(x * 2)
  },
  step: {
    name: "دالة درجية",
    fn: (x) => (x < 1 ? 0.6 : x < 2 ? 2.6 : 4.5)
  }
};

const OPTIMIZER_SEEDS = {
  piecewise: [
    { w: 1.1, b: -0.2, outW: 0.7, activation: "relu" },
    { w: 2.0, b: -2.0, outW: -1.1, activation: "relu" },
    { w: 2.2, b: -4.4, outW: 1.0, activation: "relu" }
  ],
  sine_approx: [
    { w: 2.3, b: -1.8, outW: 1.2, activation: "tanh" },
    { w: -2.0, b: 2.5, outW: -1.0, activation: "tanh" },
    { w: 3.0, b: -4.3, outW: 0.9, activation: "sigmoid" }
  ],
  step: [
    { w: 7.5, b: -7.5, outW: 1.2, activation: "sigmoid" },
    { w: 7.5, b: -15.0, outW: 1.0, activation: "sigmoid" },
    { w: 7.5, b: -22.5, outW: 1.0, activation: "sigmoid" }
  ]
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function normalizeView(view) {
  const xCenter = (view.xMin + view.xMax) * 0.5;
  const yCenter = (view.yMin + view.yMax) * 0.5;
  const xSpan = clamp(Math.abs(view.xMax - view.xMin), MIN_VIEW_X_SPAN, MAX_VIEW_X_SPAN);
  const ySpan = clamp(Math.abs(view.yMax - view.yMin), MIN_VIEW_Y_SPAN, MAX_VIEW_Y_SPAN);
  return {
    xMin: xCenter - xSpan * 0.5,
    xMax: xCenter + xSpan * 0.5,
    yMin: yCenter - ySpan * 0.5,
    yMax: yCenter + ySpan * 0.5
  };
}

function toWorldPoint(px, py, rect, view) {
  const innerW = Math.max(1, rect.width - MAIN_PAD.left - MAIN_PAD.right);
  const innerH = Math.max(1, rect.height - MAIN_PAD.top - MAIN_PAD.bottom);
  const rx = clamp((px - MAIN_PAD.left) / innerW, 0, 1);
  const ry = clamp((rect.height - MAIN_PAD.bottom - py) / innerH, 0, 1);
  return {
    x: view.xMin + rx * (view.xMax - view.xMin),
    y: view.yMin + ry * (view.yMax - view.yMin)
  };
}

function clampParam(key, value) {
  const [min, max] = PARAM_LIMITS[key];
  return clamp(value, min, max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function cloneUnits(units) {
  return units.map((u) => ({ ...u }));
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(10, Math.floor(rect.width));
  const H = Math.max(10, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { ctx, W, H };
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

function drawGlowLine(ctx, points, color, lineWidth) {
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

function computeMSEForUnits(units, targetFn, xMin, xMax, steps = 180) {
  let sum = 0;
  for (let i = 0; i <= steps; i += 1) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const yHat = computeOutput(x, units);
    const y = targetFn(x);
    sum += (yHat - y) ** 2;
  }
  return sum / (steps + 1);
}

function mapSeedToUnits(baseUnits, seed) {
  return baseUnits.map((u, i) => {
    const s = seed?.[i];
    if (!s) return { ...u };
    return {
      ...u,
      w: clampParam("w", Number.isFinite(s.w) ? s.w : u.w),
      b: clampParam("b", Number.isFinite(s.b) ? s.b : u.b),
      outW: clampParam("outW", Number.isFinite(s.outW) ? s.outW : u.outW),
      activation: ACTIVATION_CHOICES.includes(s.activation) ? s.activation : u.activation
    };
  });
}

function optimizeUnits(baseUnits, targetFn, targetKey, xMin, xMax) {
  const seeds = [
    cloneUnits(baseUnits),
    mapSeedToUnits(baseUnits, OPTIMIZER_SEEDS[targetKey]),
    mapSeedToUnits(
      baseUnits,
      baseUnits.map((u) => ({ ...u, activation: "relu" }))
    )
  ];

  let bestUnits = cloneUnits(baseUnits);
  let bestLoss = computeMSEForUnits(bestUnits, targetFn, xMin, xMax);

  seeds.forEach((seedUnits) => {
    let current = cloneUnits(seedUnits);
    let currentLoss = computeMSEForUnits(current, targetFn, xMin, xMax);
    let stepW = 1.3;
    let stepB = 1.2;
    let stepOut = 0.9;

    for (let iter = 0; iter < 34; iter += 1) {
      for (let i = 0; i < current.length; i += 1) {
        if (iter % 2 === 0) {
          ACTIVATION_CHOICES.forEach((act) => {
            if (current[i].activation === act) return;
            const candidate = cloneUnits(current);
            candidate[i].activation = act;
            const score = computeMSEForUnits(candidate, targetFn, xMin, xMax);
            if (score < currentLoss) {
              current = candidate;
              currentLoss = score;
            }
          });
        }

        [
          ["w", stepW],
          ["b", stepB],
          ["outW", stepOut]
        ].forEach(([key, step]) => {
          [-1, 1].forEach((dir) => {
            const candidate = cloneUnits(current);
            candidate[i][key] = clampParam(key, candidate[i][key] + dir * step);
            const score = computeMSEForUnits(candidate, targetFn, xMin, xMax);
            if (score < currentLoss) {
              current = candidate;
              currentLoss = score;
            }
          });
        });
      }

      stepW *= 0.9;
      stepB *= 0.9;
      stepOut *= 0.88;
    }

    if (currentLoss < bestLoss) {
      bestUnits = current;
      bestLoss = currentLoss;
    }
  });

  return bestUnits;
}

function sampleCurves(units, targetFn, xMin, xMax) {
  const xVals = [];
  const targetVals = [];
  const outputVals = [];
  const contributions = units.map(() => []);
  const activationXs = [];

  units.forEach((unit) => {
    if (Math.abs(unit.w) > 1e-6) {
      const ax = -unit.b / unit.w;
      if (Number.isFinite(ax)) activationXs.push(ax);
    }
  });

  for (let x = xMin; x <= xMax + 1e-9; x += 0.01) {
    xVals.push(x);
    targetVals.push(targetFn(x));
    outputVals.push(computeOutput(x, units));
    units.forEach((unit, i) => {
      contributions[i].push(computeUnit(x, unit).a * (Number(unit.outW) || 0));
    });
  }

  return {
    xVals,
    targetVals,
    outputVals,
    contributions,
    activationXs,
    yMin: MAIN_Y_MIN,
    yMax: MAIN_Y_MAX
  };
}

export default function NetworkBuilder({ onMSEChange }) {
  const [units, setUnits] = useState(BASE_UNITS);
  const [targetFn, setTargetFn] = useState("piecewise");
  const [highlightUnit, setHighlightUnit] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [autoOptimizing, setAutoOptimizing] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const domainXMin = 0;
  const domainXMax = 3;
  const [view, setView] = useState({
    xMin: domainXMin,
    xMax: domainXMax,
    yMin: MAIN_Y_MIN,
    yMax: MAIN_Y_MAX
  });
  const [isPanning, setIsPanning] = useState(false);

  const mainCanvasRef = useRef(null);
  const plotWrapRef = useRef(null);
  const unitCanvasRefs = useRef([]);
  const optimizeRafRef = useRef(null);
  const viewRef = useRef(view);
  const panRef = useRef({
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0
  });
  const target = TARGET_FUNCTIONS[targetFn];

  const mseValue = useMemo(
    () => computeMSEForUnits(units, target.fn, domainXMin, domainXMax),
    [target, units]
  );
  const mse = mseValue.toFixed(4);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    onMSEChange?.(mseValue);
  }, [mseValue, onMSEChange]);

  useEffect(() => {
    if (!isFocusMode) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsFocusMode(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFocusMode]);

  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return undefined;
    let frame = 0;

    const draw = () => {
      const { ctx, W, H } = setupCanvas(canvas);
      const currentView = normalizeView(viewRef.current);
      const sampled = sampleCurves(units, target.fn, currentView.xMin, currentView.xMax);
      const PAD = MAIN_PAD;
      const pw = W - PAD.left - PAD.right;
      const ph = H - PAD.top - PAD.bottom;
      const xSpan = Math.max(1e-9, currentView.xMax - currentView.xMin);
      const ySpan = Math.max(1e-9, currentView.yMax - currentView.yMin);
      const clampY = (y) => clamp(y, currentView.yMin, currentView.yMax);

      const toC = (x, y) => ({
        cx: PAD.left + ((x - currentView.xMin) / xSpan) * pw,
        cy: PAD.top + ph - ((clampY(y) - currentView.yMin) / ySpan) * ph
      });

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      const gridStepX = getNiceStep(xSpan, 10);
      const gridStepY = getNiceStep(ySpan, 8);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (
        let x = Math.ceil(currentView.xMin / gridStepX) * gridStepX;
        x <= currentView.xMax + 1e-9;
        x += gridStepX
      ) {
        const { cx } = toC(x, currentView.yMin);
        ctx.beginPath();
        ctx.moveTo(cx, PAD.top);
        ctx.lineTo(cx, H - PAD.bottom);
        ctx.stroke();
      }
      for (
        let y = Math.ceil(currentView.yMin / gridStepY) * gridStepY;
        y <= currentView.yMax + 1e-9;
        y += gridStepY
      ) {
        const { cy } = toC(currentView.xMin, y);
        ctx.beginPath();
        ctx.moveTo(PAD.left, cy);
        ctx.lineTo(W - PAD.right, cy);
        ctx.stroke();
      }

      sampled.activationXs.forEach((ax, idx) => {
        if (ax < currentView.xMin || ax > currentView.xMax) return;
        const { cx } = toC(ax, 0);
        const color = units[idx]?.color || "#94a3b8";
        ctx.strokeStyle = `${color}66`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(cx, PAD.top);
        ctx.lineTo(cx, H - PAD.bottom);
        ctx.stroke();
      });

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      if (currentView.yMin <= 0 && currentView.yMax >= 0) {
        const { cy: yZero } = toC(currentView.xMin, 0);
        ctx.beginPath();
        ctx.moveTo(PAD.left, yZero);
        ctx.lineTo(W - PAD.right, yZero);
        ctx.stroke();
      }
      if (currentView.xMin <= 0 && currentView.xMax >= 0) {
        const { cx: xZero } = toC(0, currentView.yMin);
        ctx.beginPath();
        ctx.moveTo(xZero, PAD.top);
        ctx.lineTo(xZero, H - PAD.bottom);
        ctx.stroke();
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      for (
        let x = Math.ceil(currentView.xMin / gridStepX) * gridStepX;
        x <= currentView.xMax + 1e-9;
        x += gridStepX
      ) {
        if (Math.abs(x) < 1e-9) continue;
        const { cx } = toC(x, 0);
        if (cx < PAD - 8 || cx > W - PAD + 8) continue;
        ctx.fillText(x.toFixed(Math.abs(gridStepX) >= 1 ? 0 : 1), cx, H - PAD.bottom + 18);
      }

      units.forEach((unit, i) => {
        if (highlightUnit !== null && highlightUnit !== i) return;
        const alpha = highlightUnit === i ? 1 : 0.35;
        const points = sampled.xVals.map((x, idx) => toC(x, sampled.contributions[i][idx]));
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = `${unit.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = highlightUnit === i ? 2.3 : 1.2;
        strokeSmoothCurve(ctx, points);
        ctx.restore();
      });

      const targetPoints = sampled.xVals.map((x, idx) => toC(x, sampled.targetVals[idx]));
      drawGlowLine(ctx, targetPoints, "#06b6d4", 3);

      const outputPoints = sampled.xVals.map((x, idx) => toC(x, sampled.outputVals[idx]));
      drawGlowLine(ctx, outputPoints, "#f97316", 2.8);

      const legend = [
        { color: "#06b6d4", label: "الهدف (Target)", dashed: false },
        { color: "#f97316", label: "المخرجات المجمعة", dashed: false },
        { color: "rgba(148,163,184,0.85)", label: "خطوط نقاط التفعيل", dashed: false },
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
        lx += ctx.measureText(item.label).width + 48;
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
  }, [highlightUnit, target.fn, units, isFocusMode, view]);

  useEffect(() => {
    const cleanups = [];
    units.forEach((unit, i) => {
      const canvas = unitCanvasRefs.current[i];
      if (!canvas) return;
      let frame = 0;

      const draw = () => {
        const { ctx, W, H } = setupCanvas(canvas);
        const PAD = 18;
        const pw = W - PAD * 2;
        const ph = H - PAD * 2;
        const yMin = -8;
        const yMax = 8;

        const toC = (x, y) => ({
          cx: PAD + ((x - domainXMin) / (domainXMax - domainXMin)) * pw,
          cy: PAD + ph - ((clamp(y, yMin, yMax) - yMin) / (yMax - yMin)) * ph
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

        const aPoints = [];
        for (let x = domainXMin; x <= domainXMax + 1e-6; x += 0.02) {
          aPoints.push(toC(x, computeUnit(x, unit).a));
        }
        drawGlowLine(ctx, aPoints, unit.color, 2.1);
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

      cleanups.push(() => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", scheduleDraw);
        resizeObserver?.disconnect();
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [units, domainXMax, domainXMin, isFocusMode]);

  useEffect(() => {
    return () => {
      if (optimizeRafRef.current) cancelAnimationFrame(optimizeRafRef.current);
    };
  }, []);

  useEffect(() => {
    const wrap = plotWrapRef.current;
    if (!wrap) return undefined;
    wrap.style.touchAction = "none";

    const onPointerDown = (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      const rect = wrap.getBoundingClientRect();
      panRef.current = {
        active: true,
        pointerId: event.pointerId,
        lastX: event.clientX - rect.left,
        lastY: event.clientY - rect.top
      };
      setIsPanning(true);
      setTooltipData(null);
      wrap.style.cursor = "grabbing";
      wrap.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      const pan = panRef.current;
      if (!pan.active || pan.pointerId !== event.pointerId) return;

      const rect = wrap.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;
      const dx = currentX - pan.lastX;
      const dy = currentY - pan.lastY;
      pan.lastX = currentX;
      pan.lastY = currentY;

      const currentView = viewRef.current;
      const innerW = Math.max(1, rect.width - MAIN_PAD.left - MAIN_PAD.right);
      const innerH = Math.max(1, rect.height - MAIN_PAD.top - MAIN_PAD.bottom);
      const worldDx = (dx / innerW) * (currentView.xMax - currentView.xMin);
      const worldDy = (dy / innerH) * (currentView.yMax - currentView.yMin);

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
      if (wrap.hasPointerCapture(event.pointerId)) {
        wrap.releasePointerCapture(event.pointerId);
      }
      wrap.style.cursor = "grab";
    };

    const onWheel = (event) => {
      event.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const currentView = viewRef.current;
      const anchor = toWorldPoint(px, py, rect, currentView);
      const factor = event.deltaY > 0 ? 1.1 : 0.9;

      setView((prev) =>
        normalizeView({
          xMin: anchor.x + (prev.xMin - anchor.x) * factor,
          xMax: anchor.x + (prev.xMax - anchor.x) * factor,
          yMin: anchor.y + (prev.yMin - anchor.y) * factor,
          yMax: anchor.y + (prev.yMax - anchor.y) * factor
        })
      );
    };

    wrap.style.cursor = "grab";
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("wheel", onWheel);
      wrap.style.cursor = "default";
    };
  }, []);

  const updateUnit = (id, field, value) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        if (field === "activation") return { ...u, activation: value };
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return u;
        return { ...u, [field]: clampParam(field, parsed) };
      })
    );
  };

  const resetUnit = (id) => {
    const defaults = BASE_UNITS.find((u) => u.id === id);
    if (!defaults) return;
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...defaults } : u)));
  };

  const handleAutoOptimize = () => {
    if (autoOptimizing) return;
    const best = optimizeUnits(units, target.fn, targetFn, domainXMin, domainXMax);

    const start = cloneUnits(units);
    const duration = 1700;
    const startTime = performance.now();
    setAutoOptimizing(true);

    const tick = (now) => {
      const t = clamp((now - startTime) / duration, 0, 1);
      const e = easeInOut(t);
      setUnits(
        start.map((u, i) => ({
          ...u,
          w: lerp(u.w, best[i].w, e),
          b: lerp(u.b, best[i].b, e),
          outW: lerp(u.outW, best[i].outW, e),
          activation: t < 0.55 ? u.activation : best[i].activation
        }))
      );

      if (t < 1) {
        optimizeRafRef.current = requestAnimationFrame(tick);
      } else {
        optimizeRafRef.current = null;
        setAutoOptimizing(false);
      }
    };

    optimizeRafRef.current = requestAnimationFrame(tick);
  };

  const handlePlotMouseMove = (e) => {
    if (panRef.current.active) return;
    const wrap = plotWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const plotW = rect.width - MAIN_PAD.left - MAIN_PAD.right;

    if (plotW <= 10) return;
    const currentView = viewRef.current;
    const x = currentView.xMin + ((xPx - MAIN_PAD.left) / plotW) * (currentView.xMax - currentView.xMin);
    if (x < currentView.xMin || x > currentView.xMax) {
      setTooltipData(null);
      return;
    }

    const unitOutputs = units.map((unit) => computeUnit(x, unit));
    const total = unitOutputs.reduce((sum, out, idx) => sum + out.a * (Number(units[idx].outW) || 0), 0);
    const yTarget = target.fn(x);
    const error = Math.abs(total - yTarget);

    setTooltipData({
      x: x.toFixed(2),
      total: total.toFixed(3),
      target: yTarget.toFixed(3),
      error: error.toFixed(3),
      units: unitOutputs.map((u, i) => ({
        label: units[i].label,
        color: units[i].color,
        a: u.a.toFixed(3),
        active: u.active
      }))
    });
    setTooltipPos({
      x: clamp(xPx + 15, 8, rect.width - 210),
      y: clamp(yPx - 12, 8, rect.height - 220)
    });
  };

  return (
    <section className={`network-builder ${isFocusMode ? "is-focus-mode" : ""}`}>
      <div className="nb-header">
        <div className="nb-controls-inline">
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
          <button type="button" className="nb-auto-btn" disabled={autoOptimizing} onClick={handleAutoOptimize}>
            {autoOptimizing ? "جاري التحسين..." : "تحسين تلقائي"}
          </button>
          <button type="button" className="nb-fullscreen-btn" onClick={() => setIsFocusMode((prev) => !prev)}>
            {isFocusMode ? "خروج من الملء" : "ملء شاشة الرسم"}
          </button>
          <button
            type="button"
            className="nb-fullscreen-btn nb-reset-view-btn"
            onClick={() =>
              setView({
                xMin: domainXMin,
                xMax: domainXMax,
                yMin: MAIN_Y_MIN,
                yMax: MAIN_Y_MAX
              })
            }
          >
            Reset View
          </button>
        </div>

        <div className={`mse-display ${Number(mse) < 0.1 ? "good" : Number(mse) < 0.5 ? "ok" : "bad"}`}>
          <span>MSE</span>
          <strong>{mse}</strong>
          <span>{Number(mse) < 0.1 ? "ممتاز" : Number(mse) < 0.5 ? "مقبول" : "ضعيف"}</span>
        </div>
      </div>

      <div className="nb-body">
        <div
          className={`nb-main-plot ${isPanning ? "is-panning" : ""}`}
          ref={plotWrapRef}
          onMouseMove={handlePlotMouseMove}
          onMouseLeave={() => {
            setTooltipData(null);
            setTooltipPos(null);
          }}
        >
          <canvas ref={mainCanvasRef} className="nb-canvas" />

          {tooltipData && tooltipPos && (
            <div className="plot-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
              <div className="tt-header">x = {tooltipData.x}</div>
              {tooltipData.units.map((u) => (
                <div key={u.label} className="tt-row">
                  <span style={{ color: u.color }}>
                    {u.active ? "●" : "○"} {u.label}
                  </span>
                  <span>a = {u.a}</span>
                </div>
              ))}
              <div className="tt-divider" />
              <div className="tt-row">
                <span style={{ color: "#f97316" }}>المجموع</span>
                <strong>{tooltipData.total}</strong>
              </div>
              <div className="tt-row">
                <span style={{ color: "#06b6d4" }}>الهدف</span>
                <strong>{tooltipData.target}</strong>
              </div>
              <div className="tt-row error">
                <span>الخطأ</span>
                <strong>{tooltipData.error}</strong>
              </div>
            </div>
          )}
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
                <div className="unit-header-actions">
                  <code>
                    z={unit.w.toFixed(1)}x {unit.b >= 0 ? "+" : ""}
                    {unit.b.toFixed(1)}
                  </code>
                  <button type="button" className="unit-reset-btn" onClick={() => resetUnit(unit.id)}>
                    إعادة
                  </button>
                </div>
              </div>

              <canvas
                ref={(el) => {
                  unitCanvasRefs.current[i] = el;
                }}
                className="unit-canvas"
              />

              <div className="unit-activation-select">
                <label>دالة التفعيل:</label>
                <div className="activation-pills">
                  {ACTIVATION_CHOICES.map((fn) => (
                    <button
                      key={`${unit.id}-${fn}`}
                      type="button"
                      className={`pill ${unit.activation === fn ? "active" : ""}`}
                      onClick={() => updateUnit(unit.id, "activation", fn)}
                    >
                      {fn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="unit-sliders">
                <div className="slider-row">
                  <span>w{i + 1}</span>
                  <input type="range" min="-8" max="8" step="0.1" value={unit.w} onChange={(e) => updateUnit(unit.id, "w", e.target.value)} />
                  <strong>{unit.w.toFixed(1)}</strong>
                </div>
                <div className="slider-row">
                  <span>b{i + 1}</span>
                  <input type="range" min="-30" max="12" step="0.1" value={unit.b} onChange={(e) => updateUnit(unit.id, "b", e.target.value)} />
                  <strong>{unit.b.toFixed(1)}</strong>
                </div>
                <div className="slider-row">
                  <span>v{i + 1}</span>
                  <input type="range" min="-6" max="6" step="0.1" value={unit.outW} onChange={(e) => updateUnit(unit.id, "outW", e.target.value)} />
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


