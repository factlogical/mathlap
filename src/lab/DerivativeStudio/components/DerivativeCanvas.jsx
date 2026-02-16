import { useEffect, useRef, useState } from "react";

function getGridStep(span) {
    if (!Number.isFinite(span) || span <= 0) return 1;
    const rough = span / 10;
    const power = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / power;
    if (normalized >= 5) return 5 * power;
    if (normalized >= 2) return 2 * power;
    return power;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distanceSq(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

function formatAxisValue(value) {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) < 1e-8) return "0";
    if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) return value.toExponential(1);
    if (Math.abs(value - Math.round(value)) < 1e-8) return String(Math.round(value));
    return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export default function DerivativeCanvas({
    engine,
    data,
    a,
    h: deltaH,
    xRange,
    yRange,
    showSecant,
    showTangent,
    showTriangle,
    highlight,
    forcedVisible,
    presentationMode = false,
    functionLabel = "",
    showInlineMetrics = false,
    onDragPoint,
    onViewportTransform
}) {
    const canvasRef = useRef(null);
    const interactionRef = useRef({
        width: 1,
        height: 1,
        xRange: [-5, 5],
        yRange: [-2, 10],
        pointA: null,
        pointB: null
    });
    const dragStateRef = useRef({
        active: false,
        type: null,
        pointerId: null,
        lastX: 0,
        lastY: 0
    });
    const [resizeTick, setResizeTick] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect) return;
            if (rect.width > 0 && rect.height > 0) {
                setResizeTick((prev) => prev + 1);
            }
        });

        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !engine || engine.error || !data) return;

        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        const width = Math.max(rect.width, 1);
        const height = Math.max(rect.height, 1);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        if (data.error) {
            ctx.fillStyle = "#0b1220";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "#fecaca";
            ctx.font = "14px 'JetBrains Mono', monospace";
            ctx.fillText("Cannot render function in this range.", 16, 28);
            interactionRef.current.pointA = null;
            interactionRef.current.pointB = null;
            return;
        }

        const safeDeltaH = Math.abs(deltaH) < 1e-6 ? (deltaH >= 0 ? 1e-6 : -1e-6) : deltaH;
        const fa = engine.evalF(a);
        const fah = engine.evalF(a + safeDeltaH);

        if (!Number.isFinite(fa) || !Number.isFinite(fah)) {
            ctx.fillStyle = "#0b1220";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "#fecaca";
            ctx.font = "14px 'JetBrains Mono', monospace";
            ctx.fillText("Undefined value at A or A+h.", 16, 28);
            interactionRef.current.pointA = null;
            interactionRef.current.pointB = null;
            return;
        }

        const pointA = { x: a, y: fa };
        const pointB = { x: a + safeDeltaH, y: fah };
        const drawSecant = showSecant || forcedVisible?.secant;
        const drawTangent = showTangent || forcedVisible?.tangent;
        const drawTriangle = showTriangle || forcedVisible?.triangle;

        const toCanvas = (x, y) => ({
            x: ((x - xRange[0]) / (xRange[1] - xRange[0])) * width,
            y: height - ((y - yRange[0]) / (yRange[1] - yRange[0])) * height
        });

        interactionRef.current.width = width;
        interactionRef.current.height = height;
        interactionRef.current.xRange = xRange;
        interactionRef.current.yRange = yRange;
        interactionRef.current.pointA = toCanvas(pointA.x, pointA.y);
        interactionRef.current.pointB = toCanvas(pointB.x, pointB.y);

        const pointRadius = presentationMode ? 6.5 : 5;
        const labelFont = presentationMode ? "13px 'JetBrains Mono', monospace" : "12px 'JetBrains Mono', monospace";
        const drawPoint = (x, y, color, label) => {
            const p = toCanvas(x, y);
            ctx.fillStyle = color;
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = presentationMode ? 2 : 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.font = labelFont;
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(label, p.x + 10, p.y - 10);
        };

        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, width, height);

        const xStep = getGridStep(xRange[1] - xRange[0]);
        const yStep = getGridStep(yRange[1] - yRange[0]);
        ctx.strokeStyle = presentationMode ? "rgba(148, 163, 184, 0.24)" : "rgba(148, 163, 184, 0.16)";
        ctx.lineWidth = presentationMode ? 1.25 : 1;
        for (let x = Math.ceil(xRange[0] / xStep) * xStep; x <= xRange[1]; x += xStep) {
            const p = toCanvas(x, yRange[0]);
            ctx.beginPath();
            ctx.moveTo(p.x, 0);
            ctx.lineTo(p.x, height);
            ctx.stroke();
        }
        for (let y = Math.ceil(yRange[0] / yStep) * yStep; y <= yRange[1]; y += yStep) {
            const p = toCanvas(xRange[0], y);
            ctx.beginPath();
            ctx.moveTo(0, p.y);
            ctx.lineTo(width, p.y);
            ctx.stroke();
        }

        ctx.strokeStyle = presentationMode ? "rgba(226, 232, 240, 0.88)" : "rgba(226, 232, 240, 0.65)";
        ctx.lineWidth = presentationMode ? 1.8 : 1.25;
        if (xRange[0] <= 0 && xRange[1] >= 0) {
            const yAxis = toCanvas(0, 0).x;
            ctx.beginPath();
            ctx.moveTo(yAxis, 0);
            ctx.lineTo(yAxis, height);
            ctx.stroke();
        }
        if (yRange[0] <= 0 && yRange[1] >= 0) {
            const xAxis = toCanvas(0, 0).y;
            ctx.beginPath();
            ctx.moveTo(0, xAxis);
            ctx.lineTo(width, xAxis);
            ctx.stroke();
        }

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = presentationMode ? 3.2 : 2.5;
        ctx.beginPath();
        const samples = presentationMode ? 900 : 500;
        let started = false;
        let previousPoint = null;

        for (let i = 0; i <= samples; i += 1) {
            const x = xRange[0] + ((xRange[1] - xRange[0]) * i) / samples;
            const y = engine.evalF(x);
            if (!Number.isFinite(y)) {
                started = false;
                previousPoint = null;
                continue;
            }

            const p = toCanvas(x, y);
            if (!started) {
                ctx.moveTo(p.x, p.y);
                started = true;
            } else if (previousPoint && Math.abs(p.y - previousPoint.y) > height * 0.45) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
            previousPoint = p;
        }
        ctx.stroke();

        if (drawTriangle) {
            const pA = toCanvas(pointA.x, pointA.y);
            const pB = toCanvas(pointB.x, pointB.y);
            const pC = toCanvas(pointB.x, pointA.y);
            ctx.setLineDash([6, 5]);
            ctx.fillStyle = highlight === "triangle" ? "rgba(56, 189, 248, 0.2)" : "rgba(250, 204, 21, 0.14)";
            ctx.strokeStyle = highlight === "triangle" ? "#38bdf8" : "#fbbf24";
            ctx.lineWidth = highlight === "triangle" ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pC.x, pC.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (drawSecant) {
            const pA = toCanvas(pointA.x, pointA.y);
            const pB = toCanvas(pointB.x, pointB.y);
            ctx.strokeStyle = highlight === "secant" ? "#f59e0b" : "#fbbf24";
            ctx.lineWidth = highlight === "secant" ? (presentationMode ? 5 : 4) : (presentationMode ? 3.5 : 3);
            if (highlight === "secant") {
                ctx.shadowColor = "#fbbf24";
                ctx.shadowBlur = presentationMode ? 10 : 8;
            }
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (drawTangent && data.isDerivableAtA && Number.isFinite(data.slope_tangent)) {
            const slope = data.slope_tangent;
            const x1 = xRange[0];
            const x2 = xRange[1];
            const y1 = slope * (x1 - a) + fa;
            const y2 = slope * (x2 - a) + fa;
            if (Number.isFinite(y1) && Number.isFinite(y2)) {
                const p1 = toCanvas(x1, y1);
                const p2 = toCanvas(x2, y2);
                ctx.strokeStyle = highlight === "tangent" ? "#06b6d4" : "#22d3ee";
                ctx.lineWidth = highlight === "tangent" ? (presentationMode ? 5 : 4) : (presentationMode ? 3.5 : 3);
                if (highlight === "tangent") {
                    ctx.shadowColor = "#22d3ee";
                    ctx.shadowBlur = presentationMode ? 10 : 8;
                }
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        if (presentationMode) {
            const pA = toCanvas(pointA.x, pointA.y);
            const pB = toCanvas(pointB.x, pointB.y);
            const pC = { x: pB.x, y: pA.y };
            const axisY = clamp(toCanvas(0, 0).y, 12, height - 12);
            const axisX = clamp(toCanvas(0, 0).x, 12, width - 12);
            const deltaY = pointB.y - pointA.y;

            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = "rgba(226, 232, 240, 0.5)";
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pA.x, axisY);
            ctx.moveTo(pB.x, pB.y);
            ctx.lineTo(pB.x, axisY);
            ctx.moveTo(axisX, pA.y);
            ctx.lineTo(pA.x, pA.y);
            ctx.moveTo(axisX, pB.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.font = "14px 'JetBrains Mono', monospace";
            ctx.fillStyle = "rgba(226, 232, 240, 0.88)";
            ctx.fillText(`h = ${formatAxisValue(safeDeltaH)}`, (pA.x + pC.x) / 2 - 24, pA.y + 18);
            ctx.fillText(`Δy = ${formatAxisValue(deltaY)}`, pB.x + 10, (pA.y + pB.y) / 2);

            ctx.fillStyle = "#f87171";
            ctx.beginPath();
            ctx.arc(pA.x, axisY, 4.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(pB.x, axisY, 4.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = "14px 'JetBrains Mono', monospace";
            ctx.fillStyle = "#fca5a5";
            ctx.fillText("a", pA.x - 6, axisY + 18);
            ctx.fillStyle = "#6ee7b7";
            ctx.fillText("a+h", pB.x - 10, axisY + 18);

            if (functionLabel) {
                const cleanLabel = String(functionLabel).slice(0, 50);
                ctx.font = "700 27px 'JetBrains Mono', monospace";
                ctx.fillStyle = "rgba(56, 189, 248, 0.96)";
                const labelWidth = ctx.measureText(`f(x) = ${cleanLabel}`).width;
                ctx.fillText(`f(x) = ${cleanLabel}`, Math.max(14, width - labelWidth - 18), 34);
            }

            if (showInlineMetrics) {
                const secantValue = Number(data.slope_secant);
                const tangentValue = Number(data.slope_tangent);
                const secantText = Number.isFinite(secantValue) ? secantValue.toFixed(4) : "undefined";
                const tangentText = (data.isDerivableAtA && Number.isFinite(tangentValue))
                    ? tangentValue.toFixed(4)
                    : "not defined";
                const secantGap = (Number.isFinite(secantValue) && Number.isFinite(tangentValue))
                    ? Math.abs(secantValue - tangentValue)
                    : null;
                const lines = [
                    {
                        text: "Slope of secant line:",
                        color: "rgba(244, 114, 182, 0.95)",
                        font: "600 14px 'JetBrains Mono', monospace"
                    },
                    {
                        text: `(f(a+h)-f(a))/h = ${secantText}`,
                        color: "rgba(244, 114, 182, 0.95)",
                        font: "600 14px 'JetBrains Mono', monospace"
                    },
                    {
                        text: "Slope of tangent line:",
                        color: "rgba(34, 211, 238, 0.98)",
                        font: "600 14px 'JetBrains Mono', monospace"
                    },
                    {
                        text: `f'(a) = ${tangentText}`,
                        color: "rgba(34, 211, 238, 0.98)",
                        font: "600 14px 'JetBrains Mono', monospace"
                    },
                    secantGap !== null
                        ? {
                            text: `|secant - tangent| = ${secantGap.toFixed(5)}`,
                            color: "rgba(148, 163, 184, 0.95)",
                            font: "13px 'JetBrains Mono', monospace"
                        }
                        : {
                            text: "Tangent is not defined at this point.",
                            color: "rgba(248, 113, 113, 0.95)",
                            font: "13px 'JetBrains Mono', monospace"
                        }
                ];

                const lineGap = 3;
                const lineHeight = 20;
                const blockPadding = 6;

                let maxLineWidth = 0;
                for (const line of lines) {
                    ctx.font = line.font;
                    const w = ctx.measureText(line.text).width;
                    if (w > maxLineWidth) maxLineWidth = w;
                }

                const blockWidth = maxLineWidth;
                const blockHeight = lines.length * lineHeight + (lines.length - 1) * lineGap;
                const blockX = Math.max(12, width - blockWidth - 18);
                const candidateTops = [64, 94, 124, 154, 184, 214, 244];

                const curveIntersectsBlock = (topY) => {
                    const bottomY = topY + blockHeight;
                    const samples = 36;
                    for (let i = 0; i <= samples; i += 1) {
                        const px = blockX + (blockWidth * i) / samples;
                        const xWorld = xRange[0] + (px / width) * (xRange[1] - xRange[0]);
                        const yWorld = engine.evalF(xWorld);
                        if (!Number.isFinite(yWorld)) continue;
                        const py = toCanvas(xWorld, yWorld).y;
                        if (py >= topY - blockPadding && py <= bottomY + blockPadding) return true;
                    }
                    return false;
                };

                const tangentIntersectsBlock = (topY) => {
                    if (!(drawTangent && data.isDerivableAtA && Number.isFinite(data.slope_tangent))) return false;
                    const bottomY = topY + blockHeight;
                    const sampleXs = [blockX, blockX + blockWidth * 0.5, blockX + blockWidth];
                    for (const px of sampleXs) {
                        const xWorld = xRange[0] + (px / width) * (xRange[1] - xRange[0]);
                        const yWorld = data.slope_tangent * (xWorld - a) + fa;
                        if (!Number.isFinite(yWorld)) continue;
                        const py = toCanvas(xWorld, yWorld).y;
                        if (py >= topY - blockPadding && py <= bottomY + blockPadding) return true;
                    }
                    return false;
                };

                const secantIntersectsBlock = (topY) => {
                    if (!drawSecant) return false;
                    const bottomY = topY + blockHeight;
                    const pA = toCanvas(pointA.x, pointA.y);
                    const pB = toCanvas(pointB.x, pointB.y);
                    const steps = 40;
                    for (let i = 0; i <= steps; i += 1) {
                        const t = i / steps;
                        const px = pA.x + (pB.x - pA.x) * t;
                        const py = pA.y + (pB.y - pA.y) * t;
                        if (px >= blockX - blockPadding && px <= blockX + blockWidth + blockPadding &&
                            py >= topY - blockPadding && py <= bottomY + blockPadding) {
                            return true;
                        }
                    }
                    return false;
                };

                let topY = candidateTops[candidateTops.length - 1];
                for (const candidate of candidateTops) {
                    if (!curveIntersectsBlock(candidate) && !tangentIntersectsBlock(candidate) && !secantIntersectsBlock(candidate)) {
                        topY = candidate;
                        break;
                    }
                }

                lines.forEach((line, idx) => {
                    ctx.font = line.font;
                    ctx.fillStyle = line.color;
                    const y = topY + idx * (lineHeight + lineGap);
                    ctx.fillText(line.text, blockX, y);
                });
            }

            const drawTickLabels = (step, min, max, isX) => {
                if (!Number.isFinite(step) || step <= 0) return;
                let count = 0;
                ctx.font = "11px 'JetBrains Mono', monospace";
                ctx.fillStyle = "rgba(148, 163, 184, 0.82)";
                for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
                    count += 1;
                    if (count > 18) break;
                    const p = isX ? toCanvas(v, 0) : toCanvas(0, v);
                    if (isX) {
                        ctx.fillText(formatAxisValue(v), p.x - 10, axisY + 14);
                    } else {
                        ctx.fillText(formatAxisValue(v), axisX + 6, p.y + 3);
                    }
                }
            };
            drawTickLabels(xStep, xRange[0], xRange[1], true);
            drawTickLabels(yStep, yRange[0], yRange[1], false);
        }

        drawPoint(pointA.x, pointA.y, "#ef4444", "f(a)");
        drawPoint(pointB.x, pointB.y, "#10b981", "f(a+h)");
    }, [
        engine,
        data,
        a,
        deltaH,
        xRange,
        yRange,
        showSecant,
        showTangent,
        showTriangle,
        highlight,
        forcedVisible,
        presentationMode,
        functionLabel,
        showInlineMetrics,
        resizeTick
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.style.touchAction = "none";

        const pickPointType = (x, y) => {
            const { pointA, pointB } = interactionRef.current;
            if (!pointA || !pointB) return null;

            const hitRadiusSq = 14 * 14;
            const distA = distanceSq(x, y, pointA.x, pointA.y);
            const distB = distanceSq(x, y, pointB.x, pointB.y);
            if (distA <= hitRadiusSq && distA <= distB) return "a";
            if (distB <= hitRadiusSq) return "b";
            return null;
        };

        const toWorldX = (px) => {
            const { width, xRange: activeRange } = interactionRef.current;
            const safeWidth = Math.max(1, width);
            const xLocal = clamp(px, 0, safeWidth);
            const ratio = xLocal / safeWidth;
            return activeRange[0] + ratio * (activeRange[1] - activeRange[0]);
        };

        const toWorldY = (py) => {
            const { height, yRange: activeRange } = interactionRef.current;
            const safeHeight = Math.max(1, height);
            const yLocal = clamp(py, 0, safeHeight);
            const ratio = 1 - yLocal / safeHeight;
            return activeRange[0] + ratio * (activeRange[1] - activeRange[0]);
        };

        const getLocalPoint = (event) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        };

        const setHoverCursor = (x, y) => {
            const pointType = pickPointType(x, y);
            canvas.style.cursor = pointType ? "grab" : "move";
        };

        const onPointerDown = (event) => {
            const p = getLocalPoint(event);
            const pointType = pickPointType(p.x, p.y);
            const isPointDrag = pointType && typeof onDragPoint === "function";
            dragStateRef.current = {
                active: true,
                type: isPointDrag ? pointType : "pan",
                pointerId: event.pointerId,
                lastX: p.x,
                lastY: p.y
            };
            canvas.style.cursor = "grabbing";
            canvas.setPointerCapture(event.pointerId);
            event.preventDefault();
        };

        const onPointerMove = (event) => {
            const drag = dragStateRef.current;
            const p = getLocalPoint(event);
            if (!drag.active) {
                setHoverCursor(p.x, p.y);
                return;
            }
            if (drag.pointerId !== event.pointerId) return;
            if (drag.type === "pan") {
                const { xRange: activeX, yRange: activeY, width, height } = interactionRef.current;
                const safeWidth = Math.max(1, width);
                const safeHeight = Math.max(1, height);
                const dx = p.x - drag.lastX;
                const dy = p.y - drag.lastY;
                dragStateRef.current.lastX = p.x;
                dragStateRef.current.lastY = p.y;

                if (typeof onViewportTransform === "function") {
                    const dxWorld = (dx / safeWidth) * (activeX[1] - activeX[0]);
                    const dyWorld = (dy / safeHeight) * (activeY[1] - activeY[0]);
                    onViewportTransform({
                        kind: "pan",
                        dx: -dxWorld,
                        dy: dyWorld
                    });
                }
                return;
            }

            const worldX = toWorldX(p.x);
            onDragPoint?.({
                type: drag.type,
                x: worldX
            });
        };

        const onPointerEnd = (event) => {
            const drag = dragStateRef.current;
            if (!drag.active || drag.pointerId !== event.pointerId) return;
            dragStateRef.current = {
                active: false,
                type: null,
                pointerId: null
            };
            if (canvas.hasPointerCapture(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
            const p = getLocalPoint(event);
            setHoverCursor(p.x, p.y);
        };

        const onPointerLeave = () => {
            if (!dragStateRef.current.active) {
                canvas.style.cursor = "default";
            }
        };

        const onWheel = (event) => {
            if (typeof onViewportTransform !== "function") return;
            event.preventDefault();
            const p = getLocalPoint(event);
            const anchorX = toWorldX(p.x);
            const anchorY = toWorldY(p.y);
            onViewportTransform({
                kind: "zoom",
                factor: event.deltaY > 0 ? 1.1 : 0.9,
                anchorX,
                anchorY
            });
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerEnd);
        canvas.addEventListener("pointercancel", onPointerEnd);
        canvas.addEventListener("pointerleave", onPointerLeave);
        canvas.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerup", onPointerEnd);
            canvas.removeEventListener("pointercancel", onPointerEnd);
            canvas.removeEventListener("pointerleave", onPointerLeave);
            canvas.removeEventListener("wheel", onWheel);
            canvas.style.cursor = "default";
        };
    }, [onDragPoint, onViewportTransform]);

    return <canvas ref={canvasRef} className="derivative-canvas" />;
}
