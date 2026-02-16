import { useEffect, useMemo, useRef, useState } from "react";

const PADDING = 38;
const POINT_RADIUS = 6;
const HIT_RADIUS = 12;

const TOOL_LABELS = {
  add: "إضافة",
  move: "تحريك",
  delete: "حذف"
};

const LOGISTIC_MAP_LABELS = {
  linear: "خطي",
  polynomial: "متعدد الحدود",
  exponential: "أسي"
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createTransform(width, height, xRange, yRange) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const w = Math.max(1, width - PADDING * 2);
  const h = Math.max(1, height - PADDING * 2);

  const toCanvas = (x, y) => ({
    cx: PADDING + ((x - xMin) / (xMax - xMin)) * w,
    cy: PADDING + h - ((y - yMin) / (yMax - yMin)) * h
  });

  const toMath = (cx, cy) => ({
    x: xMin + ((cx - PADDING) / w) * (xMax - xMin),
    y: yMin + ((PADDING + h - cy) / h) * (yMax - yMin)
  });

  return { toCanvas, toMath };
}

function drawGrid(ctx, width, height, xRange, yRange, transform) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const { toCanvas } = transform;

  ctx.fillStyle = "#081226";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(70, 86, 118, 0.32)";
  ctx.lineWidth = 1;
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 1) {
    const { cx } = toCanvas(x, 0);
    ctx.beginPath();
    ctx.moveTo(cx, PADDING);
    ctx.lineTo(cx, height - PADDING);
    ctx.stroke();
  }
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += 1) {
    const { cy } = toCanvas(0, y);
    ctx.beginPath();
    ctx.moveTo(PADDING, cy);
    ctx.lineTo(width - PADDING, cy);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(196, 211, 238, 0.45)";
  ctx.lineWidth = 1.6;
  const xAxis = toCanvas(0, 0).cy;
  const yAxis = toCanvas(0, 0).cx;
  ctx.beginPath();
  ctx.moveTo(PADDING, xAxis);
  ctx.lineTo(width - PADDING, xAxis);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(yAxis, PADDING);
  ctx.lineTo(yAxis, height - PADDING);
  ctx.stroke();
}

function drawConfidenceBand(ctx, points, model, transform, xRange) {
  if (!model || typeof model.predict !== "function" || !Array.isArray(points) || points.length < 2) return;

  const mse = points.reduce((sum, point) => {
    const error = model.predict(point.x) - point.y;
    return sum + error * error;
  }, 0) / points.length;

  const std = Math.sqrt(Math.max(0, mse));
  if (!Number.isFinite(std) || std <= 1e-6) return;

  const [xMin, xMax] = xRange;
  const { toCanvas } = transform;
  const steps = 220;

  ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
  ctx.beginPath();

  for (let i = 0; i <= steps; i += 1) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const point = toCanvas(x, model.predict(x) + std);
    if (i === 0) ctx.moveTo(point.cx, point.cy);
    else ctx.lineTo(point.cx, point.cy);
  }

  for (let i = steps; i >= 0; i -= 1) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const point = toCanvas(x, model.predict(x) - std);
    ctx.lineTo(point.cx, point.cy);
  }

  ctx.closePath();
  ctx.fill();
}

function drawLinear(ctx, points, model, transform, xRange, testPointIndices, tool) {
  const { toCanvas } = transform;
  const [xMin, xMax] = xRange;

  drawConfidenceBand(ctx, points, model, transform, xRange);

  if (model && typeof model.predict === "function") {
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    if (model.kind === "polynomial") {
      const steps = 260;
      for (let i = 0; i <= steps; i += 1) {
        const x = xMin + ((xMax - xMin) * i) / steps;
        const point = toCanvas(x, model.predict(x));
        if (i === 0) ctx.moveTo(point.cx, point.cy);
        else ctx.lineTo(point.cx, point.cy);
      }
    } else if (Number.isFinite(model.w) && Number.isFinite(model.b)) {
      const start = toCanvas(xMin, model.predict(xMin));
      const end = toCanvas(xMax, model.predict(xMax));
      ctx.moveTo(start.cx, start.cy);
      ctx.lineTo(end.cx, end.cy);
    }
    ctx.stroke();
  }

  points.forEach((point, index) => {
    if (model) {
      const yPred = model.predict(point.x);
      const from = toCanvas(point.x, point.y);
      const to = toCanvas(point.x, yPred);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(from.cx, from.cy);
      ctx.lineTo(to.cx, to.cy);
      ctx.stroke();
    }
    const p = toCanvas(point.x, point.y);
    const isTest = testPointIndices?.has(index);
    ctx.fillStyle = isTest ? "rgba(249, 115, 22, 0.12)" : "#f97316";
    ctx.strokeStyle = isTest ? "#e2e8f0" : "#fff7ed";
    ctx.lineWidth = isTest ? 2 : 1.4;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = "#b9c7e7";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  const toolLabel = TOOL_LABELS[tool] || tool;
  ctx.fillText(`الأداة: ${toolLabel} | الحافة البيضاء = مجموعة الاختبار`, 14, 22);
}

function drawLogisticBackground(ctx, width, height, model, transform, isTraining = false) {
  if (!model) return;
  const downsample = isTraining ? 7 : 4;
  const bgW = Math.max(36, Math.floor((width - PADDING * 2) / downsample));
  const bgH = Math.max(36, Math.floor((height - PADDING * 2) / downsample));
  const image = ctx.createImageData(bgW, bgH);

  for (let py = 0; py < bgH; py += 1) {
    for (let px = 0; px < bgW; px += 1) {
      const cx = PADDING + (px / Math.max(1, bgW - 1)) * (width - PADDING * 2);
      const cy = PADDING + (py / Math.max(1, bgH - 1)) * (height - PADDING * 2);
      const { x, y } = transform.toMath(cx, cy);
      const prob = model.predict(x, y);
      const idx = (py * bgW + px) * 4;
      image.data[idx] = Math.round(230 * (1 - prob));
      image.data[idx + 1] = 45;
      image.data[idx + 2] = Math.round(240 * prob);
      image.data[idx + 3] = 95;
    }
  }

  const temp = document.createElement("canvas");
  temp.width = bgW;
  temp.height = bgH;
  const tempCtx = temp.getContext("2d");
  tempCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(temp, PADDING, PADDING, width - PADDING * 2, height - PADDING * 2);
}

function drawNonlinearBoundary(ctx, model, transform, xRange, yRange, isTraining = false) {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const samplesX = isTraining ? 88 : 124;
  const samplesY = isTraining ? 88 : 124;
  const iso = 0.5;
  const xStep = (xMax - xMin) / samplesX;
  const yStep = (yMax - yMin) / samplesY;
  const grid = Array(samplesY + 1)
    .fill(null)
    .map(() => Array(samplesX + 1).fill(0));

  for (let j = 0; j <= samplesY; j += 1) {
    const y = yMin + j * yStep;
    for (let i = 0; i <= samplesX; i += 1) {
      const x = xMin + i * xStep;
      grid[j][i] = model.predict(x, y);
    }
  }

  const interpolate = (x1, y1, v1, x2, y2, v2) => {
    const denom = v2 - v1;
    const t = Math.abs(denom) < 1e-8 ? 0.5 : (iso - v1) / denom;
    return {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    };
  };

  const drawSegment = (pA, pB) => {
    const cA = transform.toCanvas(pA.x, pA.y);
    const cB = transform.toCanvas(pB.x, pB.y);
    ctx.beginPath();
    ctx.moveTo(cA.cx, cA.cy);
    ctx.lineTo(cB.cx, cB.cy);
    ctx.stroke();
  };

  ctx.save();
  ctx.strokeStyle = "rgba(248, 250, 252, 0.95)";
  ctx.lineWidth = 2.05;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let j = 0; j < samplesY; j += 1) {
    const yTop = yMin + j * yStep;
    const yBottom = yTop + yStep;
    for (let i = 0; i < samplesX; i += 1) {
      const xLeft = xMin + i * xStep;
      const xRight = xLeft + xStep;

      const v0 = grid[j][i];
      const v1 = grid[j][i + 1];
      const v2 = grid[j + 1][i + 1];
      const v3 = grid[j + 1][i];

      const idx =
        (v0 >= iso ? 1 : 0) |
        (v1 >= iso ? 2 : 0) |
        (v2 >= iso ? 4 : 0) |
        (v3 >= iso ? 8 : 0);

      if (idx === 0 || idx === 15) continue;

      const top = interpolate(xLeft, yTop, v0, xRight, yTop, v1);
      const right = interpolate(xRight, yTop, v1, xRight, yBottom, v2);
      const bottom = interpolate(xRight, yBottom, v2, xLeft, yBottom, v3);
      const left = interpolate(xLeft, yBottom, v3, xLeft, yTop, v0);
      const cellCenter = (v0 + v1 + v2 + v3) * 0.25;

      if (idx === 1 || idx === 14) drawSegment(left, top);
      else if (idx === 2 || idx === 13) drawSegment(top, right);
      else if (idx === 3 || idx === 12) drawSegment(left, right);
      else if (idx === 4 || idx === 11) drawSegment(right, bottom);
      else if (idx === 6 || idx === 9) drawSegment(top, bottom);
      else if (idx === 7 || idx === 8) drawSegment(left, bottom);
      else if (idx === 5) {
        // Saddle cell (v0 and v2 on one side). Use center value to avoid broken contours.
        if (cellCenter >= iso) {
          drawSegment(top, right);
          drawSegment(bottom, left);
        } else {
          drawSegment(left, top);
          drawSegment(right, bottom);
        }
      } else if (idx === 10) {
        // Saddle cell (v1 and v3 on one side). Mirror case of idx=5.
        if (cellCenter >= iso) {
          drawSegment(left, top);
          drawSegment(right, bottom);
        } else {
          drawSegment(top, right);
          drawSegment(bottom, left);
        }
      }
    }
  }
  ctx.restore();
}

function drawLogistic(
  ctx,
  width,
  height,
  points,
  model,
  transform,
  xRange,
  yRange,
  testPointIndices,
  tool,
  selectedClass,
  isTraining = false
) {
  drawLogisticBackground(ctx, width, height, model, transform, isTraining);

  const { toCanvas } = transform;
  const [xMin, xMax] = xRange;
  if (
    model &&
    model.variant === "linear" &&
    Number.isFinite(model.w1) &&
    Number.isFinite(model.w2) &&
    Number.isFinite(model.b)
  ) {
    const y1 = model.decisionBoundaryY(xMin);
    const y2 = model.decisionBoundaryY(xMax);
    const p1 = toCanvas(xMin, y1);
    const p2 = toCanvas(xMax, y2);
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(p1.cx, p1.cy);
    ctx.lineTo(p2.cx, p2.cy);
    ctx.stroke();
  } else if (model && typeof model.predict === "function") {
    drawNonlinearBoundary(ctx, model, transform, xRange, yRange, isTraining);
  }

  points.forEach((point, index) => {
    const p = toCanvas(point.x, point.y);
    const isPositive = point.label === 1;
    const isTest = testPointIndices?.has(index);
    ctx.fillStyle = isPositive
      ? isTest
        ? "rgba(14, 165, 233, 0.16)"
        : "#0ea5e9"
      : "rgba(248, 113, 113, 0.14)";
    ctx.strokeStyle = isTest ? "#e2e8f0" : isPositive ? "#38bdf8" : "#f87171";
    ctx.lineWidth = isTest ? 2.1 : 1.8;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = "#c6d4f4";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  const toolLabel = TOOL_LABELS[tool] || tool;
  const mapLabel = LOGISTIC_MAP_LABELS[model?.variant] || model?.variant || LOGISTIC_MAP_LABELS.linear;
  ctx.fillText(`الأداة: ${toolLabel} | الفئة: ${selectedClass} | تحويل الميزات: ${mapLabel}`, 14, 22);
}

export default function InteractiveCanvas({
  mode = "linear",
  points = [],
  model,
  selectedClass = 0,
  tool = "add",
  onToolChange,
  onSelectedClassChange,
  testPointIndices = new Set(),
  xRange = [-5, 5],
  yRange = [-5, 5],
  renderTick = 0,
  isTraining = false,
  onAddPoint,
  onUpdatePoint,
  onRemovePoint
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 900, height: 520 });
  const [dragIndex, setDragIndex] = useState(-1);
  const [isHovering, setIsHovering] = useState(false);

  const transform = useMemo(
    () => createTransform(size.width, size.height, xRange, yRange),
    [size.height, size.width, xRange, yRange]
  );

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({
          width: Math.max(300, Math.round(width)),
          height: Math.max(260, Math.round(height))
        });
      }
    });
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawGrid(ctx, size.width, size.height, xRange, yRange, transform);
    if (mode === "logistic") {
      drawLogistic(
        ctx,
        size.width,
        size.height,
        points,
        model,
        transform,
        xRange,
        yRange,
        testPointIndices,
        tool,
        selectedClass,
        isTraining
      );
    } else {
      drawLinear(ctx, points, model, transform, xRange, testPointIndices, tool);
    }
  }, [isTraining, mode, model, points, renderTick, selectedClass, size.height, size.width, testPointIndices, tool, transform, xRange, yRange]);

  const getLocalCoordinates = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const findNearestIndex = (clientX, clientY) => {
    const { toCanvas } = transform;
    let nearest = -1;
    let minDistance = Infinity;
    points.forEach((point, index) => {
      const p = toCanvas(point.x, point.y);
      const distance = Math.hypot(clientX - p.cx, clientY - p.cy);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = index;
      }
    });
    return minDistance <= HIT_RADIUS ? nearest : -1;
  };

  const updatePointerGlow = (local) => {
    const node = wrapperRef.current;
    if (!node) return;
    const x = clamp((local.x / Math.max(1, size.width)) * 100, 0, 100);
    const y = clamp((local.y / Math.max(1, size.height)) * 100, 0, 100);
    node.style.setProperty("--pointer-x", `${x}%`);
    node.style.setProperty("--pointer-y", `${y}%`);
  };

  const handleMouseDown = (event) => {
    const local = getLocalCoordinates(event);
    updatePointerGlow(local);
    const nearest = findNearestIndex(local.x, local.y);

    if (tool === "delete") {
      if (nearest >= 0) onRemovePoint?.(nearest);
      return;
    }

    if (tool === "move") {
      if (nearest >= 0) setDragIndex(nearest);
      return;
    }

    const point = transform.toMath(local.x, local.y);
    point.x = clamp(point.x, xRange[0], xRange[1]);
    point.y = clamp(point.y, yRange[0], yRange[1]);

    if (mode === "logistic") {
      const label = event.button === 2 ? (selectedClass === 1 ? 0 : 1) : selectedClass;
      onAddPoint?.({ ...point, label });
    } else {
      onAddPoint?.(point);
    }
  };

  const handleMouseMove = (event) => {
    const local = getLocalCoordinates(event);
    updatePointerGlow(local);
    if (dragIndex < 0 || tool !== "move") return;
    const point = transform.toMath(local.x, local.y);
    onUpdatePoint?.(dragIndex, {
      ...points[dragIndex],
      x: clamp(point.x, xRange[0], xRange[1]),
      y: clamp(point.y, yRange[0], yRange[1])
    });
  };

  const endDrag = () => setDragIndex(-1);

  const handleDoubleClick = (event) => {
    const local = getLocalCoordinates(event);
    updatePointerGlow(local);
    const nearest = findNearestIndex(local.x, local.y);
    if (nearest >= 0) onRemovePoint?.(nearest);
  };

  const handleMouseEnter = (event) => {
    const local = getLocalCoordinates(event);
    updatePointerGlow(local);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    endDrag();
  };

  return (
    <div className={`reglab-canvas-wrap tool-${tool} ${dragIndex >= 0 ? "is-dragging" : ""} ${isHovering ? "is-hovering" : ""}`} ref={wrapperRef}>
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button type="button" className={tool === "add" ? "active" : ""} onClick={() => onToolChange?.("add")}>
            إضافة
          </button>
          <button type="button" className={tool === "move" ? "active" : ""} onClick={() => onToolChange?.("move")}>
            تحريك
          </button>
          <button type="button" className={tool === "delete" ? "active" : ""} onClick={() => onToolChange?.("delete")}>
            حذف
          </button>
        </div>
        {mode === "logistic" && (
          <div className="tool-group">
            <button
              type="button"
              className={selectedClass === 0 ? "active" : ""}
              onClick={() => onSelectedClassChange?.(0)}
            >
              الفئة 0
            </button>
            <button
              type="button"
              className={selectedClass === 1 ? "active" : ""}
              onClick={() => onSelectedClassChange?.(1)}
            >
              الفئة 1
            </button>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="reglab-canvas"
        style={{ cursor: dragIndex >= 0 ? "grabbing" : tool === "move" ? "grab" : tool === "delete" ? "not-allowed" : "crosshair" }}
        onContextMenu={(event) => event.preventDefault()}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}
