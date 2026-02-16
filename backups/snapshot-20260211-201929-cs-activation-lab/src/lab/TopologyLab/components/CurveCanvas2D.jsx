import React, { useEffect, useMemo, useRef, useState } from "react";
import { curveBounds } from "../utils/curveEngine";

const DRAWING_DOMAIN = {
  xMin: -3,
  xMax: 3,
  yMin: -3,
  yMax: 3
};

function toCanvas(point, bounds, width, height, pad = 16) {
  const xSpan = Math.max(1e-9, bounds.xMax - bounds.xMin);
  const ySpan = Math.max(1e-9, bounds.yMax - bounds.yMin);
  const usableW = Math.max(1, width - pad * 2);
  const usableH = Math.max(1, height - pad * 2);
  return {
    x: pad + ((point.x - bounds.xMin) / xSpan) * usableW,
    y: height - pad - ((point.y - bounds.yMin) / ySpan) * usableH
  };
}

function fromCanvas(x, y, bounds, width, height, pad = 16) {
  const usableW = Math.max(1, width - pad * 2);
  const usableH = Math.max(1, height - pad * 2);
  const xRatio = (x - pad) / usableW;
  const yRatio = 1 - (y - pad) / usableH;
  return {
    x: bounds.xMin + xRatio * (bounds.xMax - bounds.xMin),
    y: bounds.yMin + yRatio * (bounds.yMax - bounds.yMin)
  };
}

function centroid(points) {
  if (!Array.isArray(points) || points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function squaredDist(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

function catmullRomSpline(points, samplesPerSegment = 6) {
  if (!Array.isArray(points) || points.length < 4) return points || [];
  const output = [];
  const n = points.length;

  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let s = 0; s < samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = 0.5 * (
        2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );
      const y = 0.5 * (
        2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      output.push({ x, y });
    }
  }

  return output;
}

function limitPointCount(points, maxPoints = 500) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  const step = Math.ceil(points.length / maxPoints);
  const compact = [];
  for (let i = 0; i < points.length; i += step) compact.push(points[i]);
  return compact;
}

export default function CurveCanvas2D({
  curvePoints = [],
  rectangles = [],
  selectedRectIndex = null,
  onSelectRectangle,
  onCurveChange,
  drawingEnabled = false
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 960, height: 540 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverRectIndex, setHoverRectIndex] = useState(null);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [drawMessage, setDrawMessage] = useState("");

  const bounds = useMemo(() => curveBounds(curvePoints, 0.42), [curvePoints]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const node = containerRef.current;

    const resize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(260, Math.floor(rect.height));
      setSize({ width, height });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rectangleCenters = useMemo(
    () => rectangles.map((rect) => centroid(rect.points)),
    [rectangles]
  );

  const pickRectangleIndex = (mouseX, mouseY) => {
    if (!Array.isArray(rectangles) || rectangles.length === 0) return null;
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < rectangles.length; i += 1) {
      const centerPx = toCanvas(rectangleCenters[i], bounds, size.width, size.height);
      const dist = squaredDist({ x: mouseX, y: mouseY }, centerPx);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return bestDist <= 22 * 22 ? best : null;
  };

  const pushDrawPoint = (mouseX, mouseY) => {
    const p = fromCanvas(
      mouseX,
      mouseY,
      DRAWING_DOMAIN,
      size.width,
      size.height
    );
    setDrawnPoints((prev) => {
      const last = prev[prev.length - 1];
      if (!last || squaredDist(last, p) > 0.002) {
        return [...prev, p];
      }
      return prev;
    });
  };

  const handlePointerDown = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!drawingEnabled) {
      const picked = pickRectangleIndex(x, y);
      if (picked !== null && typeof onSelectRectangle === "function") {
        onSelectRectangle(picked);
      }
      return;
    }

    setDrawMessage("");
    setDrawnPoints([]);
    pushDrawPoint(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDrawing && drawingEnabled) {
      pushDrawPoint(x, y);
      return;
    }

    const picked = pickRectangleIndex(x, y);
    setHoverRectIndex(picked);
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (drawnPoints.length < 12) {
      setDrawMessage("ارسم منحنى أطول (على الأقل 12 نقطة).");
      return;
    }

    const smoothCurve = limitPointCount(catmullRomSpline(drawnPoints, 6), 500);
    if (smoothCurve.length >= 24 && typeof onCurveChange === "function") {
      onCurveChange(smoothCurve);
      setDrawMessage(`تم اعتماد الرسم (${smoothCurve.length} نقطة).`);
      setDrawnPoints([]);
    } else {
      setDrawMessage("تعذر تنعيم الرسم بشكل كافٍ. جرّب منحنى أوضح.");
    }
  };

  useEffect(() => {
    if (drawingEnabled) return;
    setDrawnPoints([]);
    setIsDrawing(false);
    setDrawMessage("");
  }, [drawingEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#071226");
    bg.addColorStop(1, "#0a1730");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const pad = 16;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i += 1) {
      const tx = pad + ((width - pad * 2) * i) / 6;
      const ty = pad + ((height - pad * 2) * i) / 6;
      ctx.beginPath();
      ctx.moveTo(tx, pad);
      ctx.lineTo(tx, height - pad);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad, ty);
      ctx.lineTo(width - pad, ty);
      ctx.stroke();
    }

    const origin = toCanvas({ x: 0, y: 0 }, bounds, width, height, pad);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pad, origin.y);
    ctx.lineTo(width - pad, origin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(origin.x, pad);
    ctx.lineTo(origin.x, height - pad);
    ctx.stroke();

    if (Array.isArray(curvePoints) && curvePoints.length > 1) {
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      curvePoints.forEach((p, i) => {
        const cp = toCanvas(p, bounds, width, height, pad);
        if (i === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      const first = toCanvas(curvePoints[0], bounds, width, height, pad);
      ctx.lineTo(first.x, first.y);
      ctx.stroke();
    }

    const manyRectangles = rectangles.length > 36;

    rectangles.forEach((rect, index) => {
      const ordered = Array.isArray(rect.points) ? rect.points : [];
      if (ordered.length !== 4) return;

      const isSelected = index === selectedRectIndex;
      const isHover = index === hoverRectIndex;
      const alpha = isSelected ? 0.95 : isHover ? 0.8 : manyRectangles ? 0.28 : 0.38;
      const hue = (index * 137.508) % 360;
      const strokeColor = isSelected
        ? "rgba(251, 191, 36, 0.95)"
        : manyRectangles
          ? `hsla(${hue}, 82%, 62%, ${alpha})`
          : `rgba(16, 185, 129, ${alpha})`;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected ? 2.8 : isHover ? 2 : 1.5;
      ctx.beginPath();
      ordered.forEach((point, i) => {
        const cp = toCanvas(point, bounds, width, height, pad);
        if (i === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      const p0 = toCanvas(ordered[0], bounds, width, height, pad);
      ctx.lineTo(p0.x, p0.y);
      ctx.stroke();

      const c = centroid(ordered);
      const cpx = toCanvas(c, bounds, width, height, pad);
      ctx.fillStyle = isSelected ? "#fbbf24" : "#22d3ee";
      ctx.beginPath();
      ctx.arc(cpx.x, cpx.y, isSelected ? 4.2 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    });

    if (selectedRectIndex !== null && rectangles[selectedRectIndex]) {
      const selected = rectangles[selectedRectIndex];
      selected.points.forEach((point) => {
        const cp = toCanvas(point, bounds, width, height, pad);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 3.3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (drawingEnabled && drawnPoints.length > 1) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.92)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      drawnPoints.forEach((p, i) => {
        const cp = toCanvas(p, DRAWING_DOMAIN, width, height, pad);
        if (i === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      if (!isDrawing) ctx.closePath();
      ctx.stroke();

      const first = toCanvas(drawnPoints[0], DRAWING_DOMAIN, width, height, pad);
      ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
      ctx.beginPath();
      ctx.arc(first.x, first.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    if (drawingEnabled) {
      const hint = isDrawing
        ? `Drawing... ${drawnPoints.length} pts (release to close).`
        : drawMessage || "Drawing mode: drag to sketch a closed curve.";
      ctx.fillText(hint, 16, 20);
    } else {
      ctx.fillText("Click a rectangle center to inspect its 3D collision.", 16, 20);
    }
  }, [
    bounds,
    curvePoints,
    drawingEnabled,
    hoverRectIndex,
    isDrawing,
    rectangles,
    selectedRectIndex,
    size,
    drawnPoints,
    drawMessage
  ]);

  return (
    <div className="topology-curve-canvas-wrap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrawing}
        onPointerLeave={finishDrawing}
        className={`topology-curve-canvas ${drawingEnabled ? "is-drawing" : ""}`}
      />
    </div>
  );
}
