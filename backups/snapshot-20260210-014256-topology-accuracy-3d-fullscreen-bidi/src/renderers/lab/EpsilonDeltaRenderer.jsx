import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Eye,
    EyeOff,
    Info,
    Maximize2,
    Minimize2,
    Pause,
    Play,
    RotateCcw,
    Share2,
    Sliders,
    Sparkles,
    Download
} from "lucide-react";
import * as math from "mathjs";
import { interpretPromptToJson } from "../../agent/interpret";
import ChatInterface from "../../components/chat/ChatInterface";

const SPEED_PRESETS = {
    slow: { interval: 420, step: 0.03 },
    normal: { interval: 240, step: 0.05 },
    fast: { interval: 120, step: 0.08 }
};

const EPS_MIN = 0.001;
const EPS_MAX = 2;
const DEFAULT_DOMAIN = { x: [-1, 5], y: [-1, 7] };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const EpsilonDeltaRenderer = ({ spec }) => {
    const canvasRef = useRef(null);
    const graphWrapRef = useRef(null);
    const scaleRef = useRef(null);

    const data = spec?.data || spec || {};
    const epsilonDeltaPairs = Array.isArray(data.epsilon_delta_pairs) ? data.epsilon_delta_pairs : [];

    const initialExpression = data.function?.expression || data.function || "(x^2 - 4)/(x - 2)";
    const initialSimplified = data.function?.simplified || "x + 2";
    const initialPointA = data.point?.a ?? 2;
    const initialLimitL = data.point?.L ?? 4;

    const mergedDomain = useMemo(() => {
        const input = data.domain || {};
        const xDomain = input.x || DEFAULT_DOMAIN.x;
        const yDomain = input.y || DEFAULT_DOMAIN.y;
        return {
            x: [Math.min(xDomain[0], DEFAULT_DOMAIN.x[0]), Math.max(xDomain[1], DEFAULT_DOMAIN.x[1])],
            y: [Math.min(yDomain[0], DEFAULT_DOMAIN.y[0]), Math.max(yDomain[1], DEFAULT_DOMAIN.y[1])]
        };
    }, [data.domain]);

    const [exprInput, setExprInput] = useState(initialExpression);
    const [pointInput, setPointInput] = useState(initialPointA);
    const [limitInput, setLimitInput] = useState(initialLimitL);
    const [epsilon, setEpsilon] = useState(0.5);
    const [delta, setDelta] = useState(null);
    const [deltaMode, setDeltaMode] = useState("auto");
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState("normal");
    const [currentStep, setCurrentStep] = useState(0);
    const [stepMode, setStepMode] = useState(true);
    const [showProof, setShowProof] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [hoverInfo, setHoverInfo] = useState(null);
    const [showTestPoints, setShowTestPoints] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 980, height: 620 });
    const [controlsCollapsed, setControlsCollapsed] = useState(false);
    const [explainCollapsed, setExplainCollapsed] = useState(false);
    const [aiChatOpen, setAiChatOpen] = useState(false);
    const [tooltipMode, setTooltipMode] = useState("full");
    const [graphFullscreen, setGraphFullscreen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [pinnedPos, setPinnedPos] = useState({ x: 0, y: 0 });
    const [activeModel, setActiveModel] = useState({
        expression: initialExpression,
        simplified: initialSimplified,
        pointA: initialPointA,
        limitL: initialLimitL,
        domain: mergedDomain
    });
    const dragRef = useRef({ mode: null, active: false });
    const panelStateRef = useRef({ controls: false, explain: false });

    const explanation = data.explanation || {
        arabic: "كلما صغّرنا ε حول L نحتاج δ أصغر حول a حتى تبقى قيم f(x) داخل النطاق.",
        steps: [
            "نختار مسافة ε حول القيمة L (التسامح العمودي).",
            "نحسب δ المناسبة حول a (التسامح الأفقي).",
            "نضمن أن كل x في (a−δ, a+δ) يعطي f(x) داخل (L−ε, L+ε)."
        ]
    };

    const compiledFn = useMemo(() => {
        try {
            return math.compile(activeModel.simplified);
        } catch (error) {
            console.warn("Function compile failed:", error);
            return null;
        }
    }, [activeModel.simplified]);

    useEffect(() => {
        if (!graphWrapRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const width = Math.max(520, Math.floor(entry.contentRect.width));
            const height = Math.max(420, Math.floor(entry.contentRect.height));
            setCanvasSize({ width, height });
        });
        observer.observe(graphWrapRef.current);
        return () => observer.disconnect();
    }, []);

    const resolveDeltaFromPairs = (eps) => {
        if (!epsilonDeltaPairs.length) return null;
        const sorted = [...epsilonDeltaPairs]
            .filter(pair => typeof pair.epsilon === "number" && typeof pair.delta === "number")
            .sort((a, b) => a.epsilon - b.epsilon);

        if (!sorted.length) return null;
        if (eps <= sorted[0].epsilon) return sorted[0].delta;
        if (eps >= sorted[sorted.length - 1].epsilon) return sorted[sorted.length - 1].delta;

        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];
            if (eps >= current.epsilon && eps <= next.epsilon) {
                const t = (eps - current.epsilon) / (next.epsilon - current.epsilon);
                return current.delta + t * (next.delta - current.delta);
            }
        }
        return sorted[0].delta;
    };

    const calculateDelta = async (eps) => {
        setIsCalculating(true);
        try {
            const fromPairs = resolveDeltaFromPairs(eps);
            if (fromPairs !== null) {
                setDelta(fromPairs);
                return;
            }

            let calculatedDelta = eps;
            if (compiledFn) {
                const testX = activeModel.pointA + eps * 0.2;
                const testY = compiledFn.evaluate({ x: testX });
                const diff = Math.abs(testY - activeModel.limitL);
                calculatedDelta = diff < eps ? eps : eps * 0.6;
            }

            setDelta(calculatedDelta);
        } catch (error) {
            console.error("Delta calculation error:", error);
            setDelta(eps);
        } finally {
            setIsCalculating(false);
        }
    };

    const updateStepFromEpsilon = (eps) => {
        if (!stepMode) return;
        if (eps > 1.0) setCurrentStep(0);
        else if (eps > 0.4) setCurrentStep(1);
        else setCurrentStep(2);
    };

    useEffect(() => {
        if (deltaMode === "auto") {
            calculateDelta(epsilon);
        }
        updateStepFromEpsilon(epsilon);
    }, [epsilon, activeModel, deltaMode]);

    useEffect(() => {
        if (!isPlaying) return;
        const preset = SPEED_PRESETS[speed] || SPEED_PRESETS.normal;

        const interval = setInterval(() => {
            setEpsilon(prev => {
                const next = clamp(prev - preset.step, EPS_MIN, EPS_MAX);
                updateStepFromEpsilon(next);
                if (next <= EPS_MIN) {
                    setIsPlaying(false);
                    return 0.5;
                }
                return next;
            });
        }, preset.interval);

        return () => clearInterval(interval);
    }, [isPlaying, speed]);

    const handleAnalyze = () => {
        let simplified = exprInput;
        try {
            simplified = math.simplify(exprInput).toString();
        } catch (error) {
            simplified = exprInput;
        }

        setActiveModel({
            expression: exprInput,
            simplified,
            pointA: Number(pointInput),
            limitL: Number(limitInput),
            domain: mergedDomain
        });
        setIsPlaying(false);
        setCurrentStep(0);
        setDeltaMode("auto");
        setEpsilon(0.5);
    };

    const updatePointAndLimit = (nextA, nextL) => {
        const domain = activeModel.domain || mergedDomain;
        const clampedA = clamp(nextA, domain.x[0], domain.x[1]);
        const clampedL = clamp(nextL, domain.y[0], domain.y[1]);
        const roundedA = Number(clampedA.toFixed(3));
        const roundedL = Number(clampedL.toFixed(3));
        setPointInput(roundedA);
        setLimitInput(roundedL);
        setActiveModel(prev => ({
            ...prev,
            pointA: roundedA,
            limitL: roundedL
        }));
    };

    const updateExpression = (expression) => {
        let simplified = expression;
        try {
            simplified = math.simplify(expression).toString();
        } catch (error) {
            simplified = expression;
        }
        setExprInput(expression);
        setActiveModel(prev => ({
            ...prev,
            expression,
            simplified
        }));
        setDeltaMode("auto");
    };

    const resetLab = () => {
        setExprInput(initialExpression);
        setPointInput(initialPointA);
        setLimitInput(initialLimitL);
        setActiveModel({
            expression: initialExpression,
            simplified: initialSimplified,
            pointA: initialPointA,
            limitL: initialLimitL,
            domain: mergedDomain
        });
        setIsPlaying(false);
        setCurrentStep(0);
        setDeltaMode("auto");
        setEpsilon(0.5);
        setDelta(null);
        setShowTestPoints(false);
    };

    const enterFullscreen = () => {
        panelStateRef.current = {
            controls: controlsCollapsed,
            explain: explainCollapsed
        };
        setControlsCollapsed(true);
        setExplainCollapsed(true);
        setGraphFullscreen(true);
    };

    const exitFullscreen = () => {
        setGraphFullscreen(false);
        setControlsCollapsed(panelStateRef.current.controls);
        setExplainCollapsed(panelStateRef.current.explain);
    };

    const toggleFullscreen = () => {
        if (graphFullscreen) exitFullscreen();
        else enterFullscreen();
    };

    const applyAction = (action) => {
        if (!action || typeof action !== "object") return;
        if (action.type === "RESET") {
            resetLab();
            return;
        }
        if (action.type === "SET_FUNCTION" && action.expression) {
            updateExpression(action.expression);
            return;
        }
        if (action.type === "SET_POINT") {
            const nextA = typeof action.a === "number" ? action.a : activeModel.pointA;
            const nextL = typeof action.L === "number" ? action.L : activeModel.limitL;
            updatePointAndLimit(nextA, nextL);
            return;
        }
        if (action.type === "UPDATE_PARAM") {
            const value = Number(action.value);
            if (!Number.isFinite(value)) return;
            if (action.param === "epsilon") {
                setDeltaMode("auto");
                setEpsilon(clamp(value, EPS_MIN, EPS_MAX));
            }
            if (action.param === "delta") {
                setDeltaMode("manual");
                setDelta(clamp(value, 0.001, 10));
            }
            if (action.param === "L") {
                updatePointAndLimit(activeModel.pointA, value);
            }
            if (action.param === "a") {
                updatePointAndLimit(value, activeModel.limitL);
            }
        }
    };

    const callMathAgentAPI = async (text, context) => {
        const safeContext = context || {};
        const prompt = `
You are assisting the Epsilon-Delta Lab. Return JSON only.
Schema:
{
  "reply": "string",
  "actions": [
    { "type": "UPDATE_PARAM", "param": "epsilon|delta|L|a", "value": number },
    { "type": "SET_POINT", "a": number, "L": number },
    { "type": "SET_FUNCTION", "expression": "string" },
    { "type": "RESET" }
  ]
}

Context:
epsilon=${safeContext.epsilon}, delta=${safeContext.delta},
a=${safeContext.pointA}, L=${safeContext.limitL},
expression="${safeContext.expression}"

User: ${text}
`;
        return interpretPromptToJson(prompt, "lab_chat");
    };

    const stepPresets = [
        { label: "Step 1", epsilon: 1.2 },
        { label: "Step 2", epsilon: 0.5 },
        { label: "Step 3", epsilon: 0.15 }
    ];

    const handleNextStep = () => {
        const nextIndex = (currentStep + 1) % stepPresets.length;
        setCurrentStep(nextIndex);
        setDeltaMode("auto");
        setEpsilon(stepPresets[nextIndex].epsilon);
    };

    const drawGraph = () => {
        const canvas = canvasRef.current;
        if (!canvas || !compiledFn) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvasSize.width;
        const height = canvasSize.height;
        const padding = Math.min(70, Math.max(56, width * 0.08));

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, width, height);

        const { domain, pointA, limitL } = activeModel;
        const xScale = (width - 2 * padding) / (domain.x[1] - domain.x[0]);
        const yScale = (height - 2 * padding) / (domain.y[1] - domain.y[0]);

        const toCanvasX = (x) => padding + (x - domain.x[0]) * xScale;
        const toCanvasY = (y) => height - padding - (y - domain.y[0]) * yScale;

        scaleRef.current = {
            padding,
            width,
            height,
            domain,
            xScale,
            yScale,
            toCanvasX,
            toCanvasY
        };

        const drawTicks = (min, max, step) => {
            const ticks = [];
            const start = Math.ceil(min / step) * step;
            for (let value = start; value <= max; value += step) {
                ticks.push(Number(value.toFixed(6)));
            }
            return ticks;
        };

        const xTicks = drawTicks(domain.x[0], domain.x[1], 1);
        const yTicks = drawTicks(domain.y[0], domain.y[1], 1);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
        ctx.lineWidth = 1;
        xTicks.forEach((x) => {
            const cx = toCanvasX(x);
            ctx.beginPath();
            ctx.moveTo(cx, padding);
            ctx.lineTo(cx, height - padding);
            ctx.stroke();
        });
        yTicks.forEach((y) => {
            const cy = toCanvasY(y);
            ctx.beginPath();
            ctx.moveTo(padding, cy);
            ctx.lineTo(width - padding, cy);
            ctx.stroke();
        });

        ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
        ctx.lineWidth = 2.2;
        const zeroX = toCanvasX(0);
        const zeroY = toCanvasY(0);
        ctx.beginPath();
        ctx.moveTo(padding, zeroY);
        ctx.lineTo(width - padding, zeroY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(zeroX, padding);
        ctx.lineTo(zeroX, height - padding);
        ctx.stroke();

        ctx.fillStyle = "#cbd5f5";
        ctx.font = "12px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        xTicks.forEach((x) => {
            const cx = toCanvasX(x);
            ctx.beginPath();
            ctx.moveTo(cx, zeroY - 4);
            ctx.lineTo(cx, zeroY + 4);
            ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
            ctx.stroke();
            ctx.fillText(`${x}`, cx, zeroY + 18);
        });
        ctx.textAlign = "right";
        yTicks.forEach((y) => {
            const cy = toCanvasY(y);
            ctx.beginPath();
            ctx.moveTo(zeroX - 4, cy);
            ctx.lineTo(zeroX + 4, cy);
            ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
            ctx.stroke();
            ctx.fillText(`${y}`, zeroX - 8, cy + 4);
        });

        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "left";
        ctx.fillText("x", width - padding + 8, zeroY + 16);
        ctx.textAlign = "center";
        ctx.fillText("y", zeroX - 18, padding - 8);

        const epsilonColor = "#a855f7";
        const deltaColor = "#6366f1";

        ctx.fillStyle = "rgba(168, 85, 247, 0.16)";
        ctx.fillRect(
            padding,
            toCanvasY(limitL + epsilon),
            width - 2 * padding,
            toCanvasY(limitL - epsilon) - toCanvasY(limitL + epsilon)
        );
        ctx.strokeStyle = "rgba(168, 85, 247, 0.7)";
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(
            padding,
            toCanvasY(limitL + epsilon),
            width - 2 * padding,
            toCanvasY(limitL - epsilon) - toCanvasY(limitL + epsilon)
        );
        ctx.setLineDash([]);

        if (delta !== null) {
            ctx.fillStyle = "rgba(99, 102, 241, 0.16)";
            ctx.fillRect(
                toCanvasX(pointA - delta),
                padding,
                toCanvasX(pointA + delta) - toCanvasX(pointA - delta),
                height - 2 * padding
            );
            ctx.strokeStyle = "rgba(99, 102, 241, 0.7)";
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(
                toCanvasX(pointA - delta),
                padding,
                toCanvasX(pointA + delta) - toCanvasX(pointA - delta),
                height - 2 * padding
            );
            ctx.setLineDash([]);
        }

        // Epsilon labels + brace
        const epsTop = toCanvasY(limitL + epsilon);
        const epsBottom = toCanvasY(limitL - epsilon);
        const epsBraceX = width - padding + 6;
        const epsTextX = Math.min(width - 12, epsBraceX + 10);
        ctx.strokeStyle = epsilonColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(epsBraceX, epsTop);
        ctx.lineTo(epsBraceX, epsBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(epsBraceX - 6, epsTop);
        ctx.lineTo(epsBraceX + 6, epsTop);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(epsBraceX - 6, epsBottom);
        ctx.lineTo(epsBraceX + 6, epsBottom);
        ctx.stroke();
        ctx.fillStyle = "#e9d5ff";
        ctx.font = "12px 'Space Grotesk', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`L + ε = ${(limitL + epsilon).toFixed(3)}`, epsTextX, epsTop + 4);
        ctx.fillText(`L - ε = ${(limitL - epsilon).toFixed(3)}`, epsTextX, epsBottom + 14);
        ctx.fillText("ε", epsTextX, (epsTop + epsBottom) / 2);

        // Delta labels + brace
        if (delta !== null) {
            const deltaLeft = toCanvasX(pointA - delta);
            const deltaRight = toCanvasX(pointA + delta);
            const deltaBraceY = height - padding + 10;
            const deltaTextY = Math.min(height - 8, deltaBraceY + 18);
            ctx.strokeStyle = deltaColor;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(deltaLeft, deltaBraceY);
            ctx.lineTo(deltaRight, deltaBraceY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(deltaLeft, deltaBraceY - 6);
            ctx.lineTo(deltaLeft, deltaBraceY + 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(deltaRight, deltaBraceY - 6);
            ctx.lineTo(deltaRight, deltaBraceY + 6);
            ctx.stroke();
            ctx.fillStyle = "#c7d2fe";
            ctx.textAlign = "center";
            ctx.fillText("δ", (deltaLeft + deltaRight) / 2, deltaTextY);
            ctx.fillText("a - δ", deltaLeft, deltaTextY + 14);
            ctx.fillText("a + δ", deltaRight, deltaTextY + 14);
        }

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        let firstPoint = true;
        for (let x = domain.x[0]; x <= domain.x[1]; x += 0.01) {
            if (Math.abs(x - pointA) < 0.01) continue;
            try {
                const y = compiledFn.evaluate({ x });
                if (isFinite(y)) {
                    const cx = toCanvasX(x);
                    const cy = toCanvasY(y);
                    if (firstPoint) {
                        ctx.moveTo(cx, cy);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(cx, cy);
                    }
                }
            } catch {
                // skip invalid
            }
        }
        ctx.stroke();

        ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(padding, toCanvasY(limitL));
        ctx.lineTo(width - padding, toCanvasY(limitL));
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.beginPath();
        ctx.arc(toCanvasX(pointA), toCanvasY(limitL), 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ef4444";
        ctx.fillStyle = "#020617";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(toCanvasX(pointA), toCanvasY(limitL), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "12px 'Space Grotesk', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`(a, L) = (${pointA}, ${limitL})`, toCanvasX(pointA) + 12, toCanvasY(limitL) - 12);

        if (showTestPoints && delta !== null) {
            const testX = [
                pointA - delta * 0.8,
                pointA - delta * 0.4,
                pointA + delta * 0.2,
                pointA + delta * 0.6
            ];
            testX.forEach((x) => {
                try {
                    const y = compiledFn.evaluate({ x });
                    const insideDelta = Math.abs(x - pointA) < delta;
                    const insideEpsilon = Math.abs(y - limitL) < epsilon;
                    ctx.fillStyle = insideDelta && insideEpsilon ? "#22c55e" : "#ef4444";
                    ctx.beginPath();
                    ctx.arc(toCanvasX(x), toCanvasY(y), 4, 0, Math.PI * 2);
                    ctx.fill();
                } catch {
                    // ignore
                }
            });
        }
    };

    useEffect(() => {
        drawGraph();
    }, [epsilon, delta, activeModel, compiledFn, canvasSize, showTestPoints]);

    const handleMouseMove = (event) => {
        const canvas = canvasRef.current;
        const scale = scaleRef.current;
        if (!canvas || !scale || !compiledFn) return;
        if (tooltipMode === "hidden" || isPinned) return;

        const rect = canvas.getBoundingClientRect();
        const xPixel = event.clientX - rect.left;
        const yPixel = event.clientY - rect.top;
        const { padding, width, height, domain } = scale;

        if (
            xPixel < padding ||
            xPixel > width - padding ||
            yPixel < padding ||
            yPixel > height - padding
        ) {
            setHoverInfo(null);
            return;
        }

        const mathX = domain.x[0] + (xPixel - padding) / scale.xScale;
        try {
            const mathY = compiledFn.evaluate({ x: mathX });
            const insideDelta = delta !== null ? Math.abs(mathX - activeModel.pointA) < delta : false;
            const insideEpsilon = Math.abs(mathY - activeModel.limitL) < epsilon;

            setHoverInfo({
                x: mathX,
                y: mathY,
                screenX: xPixel,
                screenY: yPixel,
                inDelta: insideDelta,
                inEpsilon: insideEpsilon
            });
        } catch {
            setHoverInfo(null);
        }
    };

    const epsilonPercent = ((epsilon - EPS_MIN) / (EPS_MAX - EPS_MIN)) * 100;
    const bubbleLeft = clamp(epsilonPercent, 6, 94);

    const graphExpanded = controlsCollapsed && explainCollapsed;
    const tooltipX = isPinned ? pinnedPos.x : hoverInfo?.screenX;
    const tooltipY = isPinned ? pinnedPos.y : hoverInfo?.screenY;

    return (
        <div
            className={`epsilon-delta-lab ${graphExpanded ? "expanded" : ""} ${graphFullscreen ? "graph-fullscreen" : ""}`}
            dir="rtl"
        >
            <header className="epsilon-header">
                <div className="epsilon-header-main">
                    <div className="epsilon-badge">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2>مختبر تعريف النهاية (ε-δ)</h2>
                        <p className="epsilon-formula" dir="ltr">
                            lim(x→{activeModel.pointA}) {activeModel.expression} = {activeModel.limitL}
                        </p>
                    </div>
                </div>
                <div className="epsilon-header-actions">
                    <button className="epsilon-action-btn">
                        <Download size={16} />
                        تحميل
                    </button>
                    <button className="epsilon-action-btn ghost">
                        <Share2 size={16} />
                        مشاركة
                    </button>
                </div>
            </header>

            <section
                className={`epsilon-grid ${controlsCollapsed ? "left-collapsed" : ""} ${explainCollapsed ? "right-collapsed" : ""} ${controlsCollapsed && explainCollapsed ? "both-collapsed" : ""}`}
            >
                <button
                    className="epsilon-collapse-fab left"
                    onClick={() => setControlsCollapsed(prev => !prev)}
                    title={controlsCollapsed ? "إظهار لوحة التحكم" : "إخفاء لوحة التحكم"}
                >
                    {controlsCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <button
                    className="epsilon-collapse-fab right"
                    onClick={() => setExplainCollapsed(prev => !prev)}
                    title={explainCollapsed ? "إظهار الشرح" : "إخفاء الشرح"}
                >
                    {explainCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                <aside className={`epsilon-controls-panel ${controlsCollapsed ? "collapsed" : ""}`} dir="rtl">
                    <div className="epsilon-card">
                        <div className="epsilon-card-title">
                            <Sliders size={16} />
                            لوحة التحكم
                        </div>
                        <label className="epsilon-field">
                            <span>الدالة f(x)</span>
                            <input
                                value={exprInput}
                                onChange={(event) => setExprInput(event.target.value)}
                            />
                        </label>
                        <div className="epsilon-row">
                            <label className="epsilon-field">
                                <span>النقطة a</span>
                                <input
                                    type="number"
                                    value={pointInput}
                                    onChange={(event) => setPointInput(event.target.value)}
                                    className="epsilon-number-input"
                                    dir="ltr"
                                />
                            </label>
                            <label className="epsilon-field">
                                <span>القيمة L</span>
                                <input
                                    type="number"
                                    value={limitInput}
                                    onChange={(event) => setLimitInput(event.target.value)}
                                    className="epsilon-number-input"
                                    dir="ltr"
                                />
                            </label>
                        </div>
                        <button className="btn btn-primary" onClick={handleAnalyze}>
                            تحليل النموذج
                        </button>
                        <div className="epsilon-inline">
                            <CheckCircle2 size={14} />
                            الحساب يعيد ضبط δ تلقائياً.
                        </div>
                    </div>
                    <div className="epsilon-card">
                        <div className="epsilon-card-title">ε — التسامح العمودي</div>
                        <div className="epsilon-slider">
                            <input
                                type="range"
                                min={EPS_MIN}
                                max={EPS_MAX}
                                step="0.001"
                                value={epsilon}
                                onInput={(event) => {
                                    setDeltaMode("auto");
                                    setEpsilon(parseFloat(event.target.value));
                                }}
                                disabled={isCalculating}
                                className="custom-slider"
                            />
                            <div
                                className="epsilon-slider-bubble epsilon-number"
                                style={{ left: `${bubbleLeft}%` }}
                            >
                                {epsilon.toFixed(3)}
                            </div>
                        </div>
                        <p className="epsilon-helper">حدّد مقدار الخطأ المسموح في الاتجاه العمودي.</p>
                    </div>

                    <div className="epsilon-card highlight">
                        <div className="epsilon-card-title">δ — التسامح الأفقي (محسوب)</div>
                        <div className="epsilon-delta-value">
                            <span className="epsilon-number">{delta !== null ? delta.toFixed(4) : "—"}</span>
                            <span>
                                {isCalculating
                                    ? "جاري الحساب..."
                                    : deltaMode === "manual"
                                        ? "تعديل يدوي"
                                        : "محسوب تلقائياً"}
                            </span>
                        </div>
                        <div className="epsilon-math">
                            لضمان |f(x) - L| &lt; {epsilon.toFixed(3)} نحتاج
                            <strong>|x - {activeModel.pointA}| &lt; {delta ? delta.toFixed(3) : "?"}</strong>
                        </div>
                    </div>

                    <div className="epsilon-card">
                        <div className="epsilon-card-title">🎬 الحركة التعليمية</div>
                        <div className="epsilon-buttons">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setDeltaMode("auto");
                                    setIsPlaying(prev => !prev);
                                }}
                            >
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                {isPlaying ? "إيقاف" : "تشغيل"}
                            </button>
                            <button className="btn btn-secondary" onClick={() => {
                                setIsPlaying(false);
                                setEpsilon(0.5);
                                setCurrentStep(0);
                            }}>
                                <RotateCcw size={16} />
                                إعادة
                            </button>
                        </div>
                        <div className="epsilon-speed">
                            <span>السرعة</span>
                            {["slow", "normal", "fast"].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setSpeed(level)}
                                    className={speed === level ? "active" : ""}
                                >
                                    {level === "slow" ? "بطيء" : level === "normal" ? "عادي" : "سريع"}
                                </button>
                            ))}
                        </div>
                        <button className="epsilon-step-btn" onClick={handleNextStep}>
                            خطوة تالية
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="epsilon-card">
                        <div className="epsilon-card-title">🎯 نقاط اختبار</div>
                        <p className="epsilon-helper">عرض نقاط عشوائية للتأكد من شرط ε و δ.</p>
                        <button
                            className="epsilon-toggle-btn"
                            onClick={() => setShowTestPoints(prev => !prev)}
                        >
                            {showTestPoints ? "إخفاء النقاط" : "عرض النقاط"}
                        </button>
                    </div>
                </aside>

                <main className={`epsilon-graph-panel ${graphExpanded ? "expanded" : ""}`} dir="ltr">
                    <div className="epsilon-graph-stage" ref={graphWrapRef}>
                        <div className="epsilon-graph-header overlay" dir="rtl">
                            <div>
                                <h3>الرسم التفاعلي</h3>
                                <span>نطاق ε (بنفسجي) — نطاق δ (نيلي)</span>
                            </div>
                            <div className="epsilon-graph-actions">
                                <button
                                    className={`epsilon-icon-btn ${graphFullscreen ? "active" : ""}`}
                                    onClick={toggleFullscreen}
                                    title={graphFullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
                                >
                                    {graphFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button
                                    className={`epsilon-icon-btn ${tooltipMode === "hidden" ? "active" : ""}`}
                                    onClick={() => {
                                        setTooltipMode("hidden");
                                        setHoverInfo(null);
                                        setIsPinned(false);
                                    }}
                                    title="إخفاء التلميحات"
                                >
                                    {tooltipMode === "hidden" ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button
                                    className={`epsilon-icon-btn ${tooltipMode === "compact" ? "active" : ""}`}
                                    onClick={() => {
                                        if (tooltipMode === "hidden") return;
                                        setTooltipMode(prev => (prev === "compact" ? "full" : "compact"));
                                    }}
                                    title="تصغير التلميحات"
                                >
                                    <Minimize2 size={14} />
                                </button>
                            </div>
                        </div>
                        {graphFullscreen && (
                            <button
                                className="epsilon-fullscreen-exit"
                                onClick={toggleFullscreen}
                                title="خروج من ملء الشاشة"
                            >
                                <Minimize2 size={16} />
                            </button>
                        )}
                        <canvas
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => {
                                if (!isPinned) setHoverInfo(null);
                            }}
                            onClick={(event) => {
                                const canvas = canvasRef.current;
                                const scale = scaleRef.current;
                                if (!canvas || !scale || !compiledFn) return;
                                if (dragRef.current.moved) {
                                    dragRef.current.moved = false;
                                    return;
                                }

                                const rect = canvas.getBoundingClientRect();
                                const xPixel = event.clientX - rect.left;
                                const yPixel = event.clientY - rect.top;
                                const { padding, width, height, domain } = scale;
                                if (
                                    xPixel < padding ||
                                    xPixel > width - padding ||
                                    yPixel < padding ||
                                    yPixel > height - padding
                                ) return;

                                const mathX = domain.x[0] + (xPixel - padding) / scale.xScale;
                                try {
                                    const mathY = compiledFn.evaluate({ x: mathX });
                                    const insideDelta = delta !== null ? Math.abs(mathX - activeModel.pointA) < delta : false;
                                    const insideEpsilon = Math.abs(mathY - activeModel.limitL) < epsilon;
                                    setHoverInfo({
                                        x: mathX,
                                        y: mathY,
                                        screenX: xPixel,
                                        screenY: yPixel,
                                        inDelta: insideDelta,
                                        inEpsilon: insideEpsilon
                                    });
                                    if (tooltipMode === "hidden") {
                                        setTooltipMode("full");
                                    }
                                    if (isPinned) {
                                        setIsPinned(false);
                                    } else {
                                        setIsPinned(true);
                                        setPinnedPos({ x: xPixel, y: yPixel });
                                    }
                                } catch {
                                    // ignore
                                }
                            }}
                            onPointerDown={(event) => {
                                const scale = scaleRef.current;
                                const canvas = canvasRef.current;
                                if (!scale || !canvas) return;
                                dragRef.current.moved = false;
                                const rect = canvas.getBoundingClientRect();
                                const xPixel = event.clientX - rect.left;
                                const yPixel = event.clientY - rect.top;
                                const { padding, width, height } = scale;
                                if (
                                    xPixel < padding ||
                                    xPixel > width - padding ||
                                    yPixel < padding ||
                                    yPixel > height - padding
                                ) return;

                                if (tooltipMode === "hidden") {
                                    setTooltipMode("full");
                                }

                                const epsilonTop = scale.toCanvasY(activeModel.limitL + epsilon);
                                const epsilonBottom = scale.toCanvasY(activeModel.limitL - epsilon);
                                const deltaLeft = delta !== null ? scale.toCanvasX(activeModel.pointA - delta) : null;
                                const deltaRight = delta !== null ? scale.toCanvasX(activeModel.pointA + delta) : null;
                                const pointX = scale.toCanvasX(activeModel.pointA);
                                const pointY = scale.toCanvasY(activeModel.limitL);
                                const threshold = 12;

                                const epsilonDist = Math.min(
                                    Math.abs(yPixel - epsilonTop),
                                    Math.abs(yPixel - epsilonBottom)
                                );
                                const deltaDist = deltaLeft !== null
                                    ? Math.min(Math.abs(xPixel - deltaLeft), Math.abs(xPixel - deltaRight))
                                    : Number.POSITIVE_INFINITY;
                                const pointDist = Math.hypot(xPixel - pointX, yPixel - pointY);
                                const epsilonInside = yPixel >= Math.min(epsilonTop, epsilonBottom)
                                    && yPixel <= Math.max(epsilonTop, epsilonBottom);
                                const deltaInside = deltaLeft !== null && deltaRight !== null
                                    ? xPixel >= Math.min(deltaLeft, deltaRight) && xPixel <= Math.max(deltaLeft, deltaRight)
                                    : false;

                                let mode = null;
                                if (pointDist <= threshold + 4) {
                                    mode = "point";
                                } else if (epsilonInside || deltaInside || epsilonDist <= threshold || deltaDist <= threshold) {
                                    if (deltaInside && !epsilonInside) mode = "delta";
                                    else if (epsilonInside && !deltaInside) mode = "epsilon";
                                    else mode = epsilonDist <= deltaDist ? "epsilon" : "delta";
                                }
                                if (mode) {
                                    dragRef.current = { mode, active: true, moved: false };
                                    canvas.setPointerCapture?.(event.pointerId);
                                    if (mode === "epsilon") {
                                        setDeltaMode("auto");
                                    } else if (mode === "delta") {
                                        setDeltaMode("manual");
                                    }
                                }
                            }}
                            onPointerMove={(event) => {
                                const scale = scaleRef.current;
                                const canvas = canvasRef.current;
                                if (!scale || !canvas) return;
                                const rect = canvas.getBoundingClientRect();
                                const xPixel = event.clientX - rect.left;
                                const yPixel = event.clientY - rect.top;
                                const { padding, width, height, domain } = scale;

                                if (dragRef.current.active) {
                                    dragRef.current.moved = true;
                                    const mathX = domain.x[0] + (xPixel - padding) / scale.xScale;
                                    const mathY = domain.y[0] + (height - padding - yPixel) / scale.yScale;
                                    if (dragRef.current.mode === "point") {
                                        updatePointAndLimit(mathX, mathY);
                                        if (tooltipMode !== "hidden") {
                                            const insideDelta = delta !== null ? Math.abs(mathX - mathX) <= delta : false;
                                            const insideEpsilon = Math.abs(mathY - mathY) <= epsilon;
                                            setHoverInfo({
                                                x: mathX,
                                                y: mathY,
                                                screenX: xPixel,
                                                screenY: yPixel,
                                                inDelta: insideDelta,
                                                inEpsilon: insideEpsilon
                                            });
                                        }
                                        canvas.style.cursor = "grabbing";
                                        return;
                                    }
                                    if (dragRef.current.mode === "epsilon") {
                                        const nextEpsilon = clamp(Math.abs(mathY - activeModel.limitL), EPS_MIN, EPS_MAX);
                                        setDeltaMode("auto");
                                        setEpsilon(nextEpsilon);
                                    }
                                    if (dragRef.current.mode === "delta") {
                                        const nextDelta = clamp(Math.abs(mathX - activeModel.pointA), 0.01, 10);
                                        setDeltaMode("manual");
                                        setDelta(nextDelta);
                                    }
                                } else {
                                    const epsilonTop = scale.toCanvasY(activeModel.limitL + epsilon);
                                    const epsilonBottom = scale.toCanvasY(activeModel.limitL - epsilon);
                                    const deltaLeft = delta !== null ? scale.toCanvasX(activeModel.pointA - delta) : null;
                                    const deltaRight = delta !== null ? scale.toCanvasX(activeModel.pointA + delta) : null;
                                    const pointX = scale.toCanvasX(activeModel.pointA);
                                    const pointY = scale.toCanvasY(activeModel.limitL);
                                    const threshold = 10;
                                    const epsilonNear = Math.min(
                                        Math.abs(yPixel - epsilonTop),
                                        Math.abs(yPixel - epsilonBottom)
                                    ) <= threshold;
                                    const deltaNear = deltaLeft !== null
                                        ? Math.min(Math.abs(xPixel - deltaLeft), Math.abs(xPixel - deltaRight)) <= threshold
                                        : false;
                                    const pointNear = Math.hypot(xPixel - pointX, yPixel - pointY) <= threshold + 2;
                                    const epsilonInside = yPixel >= Math.min(epsilonTop, epsilonBottom)
                                        && yPixel <= Math.max(epsilonTop, epsilonBottom);
                                    const deltaInside = deltaLeft !== null && deltaRight !== null
                                        ? xPixel >= Math.min(deltaLeft, deltaRight) && xPixel <= Math.max(deltaLeft, deltaRight)
                                        : false;
                                    if (pointNear) canvas.style.cursor = "grab";
                                    else if (epsilonNear || epsilonInside) canvas.style.cursor = "ns-resize";
                                    else if (deltaNear || deltaInside) canvas.style.cursor = "ew-resize";
                                    else canvas.style.cursor = "crosshair";
                                }
                            }}
                            onPointerUp={(event) => {
                                dragRef.current = { ...dragRef.current, mode: null, active: false };
                                canvasRef.current?.releasePointerCapture?.(event.pointerId);
                            }}
                            onPointerLeave={() => {
                                if (!isPinned) setHoverInfo(null);
                                dragRef.current = { ...dragRef.current, mode: null, active: false };
                            }}
                        />

                        <AnimatePresence>
                            {hoverInfo && tooltipMode !== "hidden" && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{
                                        left: `${(tooltipX ?? 0) + 16}px`,
                                        top: `${(tooltipY ?? 0) - 90}px`
                                    }}
                                    className={`epsilon-tooltip ${tooltipMode === "compact" ? "compact" : ""} ${isPinned ? "pinned" : ""}`}
                                    dir="ltr"
                                >
                                    <div className="tooltip-header">
                                        <div className="tooltip-header-title">
                                            <span>Analysis Point</span>
                                            {isPinned && <span className="tooltip-pin">📌 Pin</span>}
                                        </div>
                                        <div className="tooltip-actions">
                                            <button
                                                onClick={() => setTooltipMode("compact")}
                                                title="Minimize"
                                            >
                                                _
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTooltipMode("hidden");
                                                    setHoverInfo(null);
                                                    setIsPinned(false);
                                                }}
                                                title="Close"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <span>x</span>
                                        <strong className="epsilon-number">{hoverInfo.x.toFixed(4)}</strong>
                                    </div>
                                    <div className="row">
                                        <span>f(x)</span>
                                        <strong className="epsilon-number">{hoverInfo.y.toFixed(4)}</strong>
                                    </div>
                                    {tooltipMode === "full" && (
                                        <>
                                            <div className="row epsilon-meta">
                                                <span>ε</span>
                                                <strong className="epsilon-number epsilon-tag">{epsilon.toFixed(3)}</strong>
                                            </div>
                                            <div className="row epsilon-meta">
                                                <span>δ</span>
                                                <strong className="epsilon-number delta-tag">{delta !== null ? delta.toFixed(3) : "—"}</strong>
                                            </div>
                                            <div className="status">
                                                <div className="status-row">
                                                    <div
                                                        className={`status-dot ${hoverInfo.inDelta ? "dot-ok" : "dot-bad"}`}
                                                    />
                                                    <span className={hoverInfo.inDelta ? "ok" : "bad"}>
                                                        {hoverInfo.inDelta ? "✓ داخل نطاق δ" : "✗ خارج نطاق δ"}
                                                    </span>
                                                </div>
                                                <div className="status-row">
                                                    <div
                                                        className={`status-dot ${hoverInfo.inEpsilon ? "dot-ok" : "dot-bad"}`}
                                                    />
                                                    <span className={hoverInfo.inEpsilon ? "ok" : "bad"}>
                                                        {hoverInfo.inEpsilon ? "✓ داخل نطاق ε" : "✗ خارج نطاق ε"}
                                                    </span>
                                                </div>
                                                {hoverInfo.inEpsilon && !hoverInfo.inDelta && (
                                                    <div className="status-warning">
                                                        ⚠️ Inside Target, but not guaranteed by Delta.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="epsilon-hoverbar overlay" dir="rtl">
                            <span>معلومات المؤشر:</span>
                            {hoverInfo ? (
                                <>
                                    x = {hoverInfo.x.toFixed(3)} | f(x) = {hoverInfo.y.toFixed(3)} |
                                    δ: {hoverInfo.inDelta ? "داخل" : "خارج"} |
                                    ε: {hoverInfo.inEpsilon ? "داخل" : "خارج"}
                                </>
                            ) : (
                                "حرّك الماوس فوق المنحنى لرؤية التفاصيل."
                            )}
                        </div>
                    </div>
                </main>

                <aside className={`epsilon-explain-panel ${explainCollapsed ? "collapsed" : ""}`} dir="rtl">
                    <div className="epsilon-card explanation">
                        <div className="epsilon-card-title">
                            <Info size={16} />
                            الشرح الذكي
                        </div>
                        <p className="epsilon-lead">{explanation.arabic}</p>
                        <div className="epsilon-steps">
                            {explanation.steps.map((step, index) => (
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: currentStep === index ? 1 : 0.5, y: 0 }}
                                    className={currentStep === index ? "step active" : "step"}
                                >
                                    <span>{index + 1}</span>
                                    <p>{step}</p>
                                </motion.div>
                            ))}
                        </div>
                        <div className="epsilon-toggle-row">
                            <label className="toggle-row">
                                <input
                                    type="checkbox"
                                    className="toggle-checkbox"
                                    checked={stepMode}
                                    onChange={(event) => setStepMode(event.target.checked)}
                                />
                                <span>وضع الخطوات</span>
                            </label>
                            <label className="toggle-row">
                                <input
                                    type="checkbox"
                                    className="toggle-checkbox"
                                    checked={showProof}
                                    onChange={(event) => setShowProof(event.target.checked)}
                                />
                                <span>إظهار البرهان</span>
                            </label>
                        </div>
                        {showProof && (
                            <div className="epsilon-proof">
                                <div>∀ε &gt; 0، ∃δ &gt; 0 بحيث:</div>
                                <div>إذا 0 &lt; |x − a| &lt; δ ⇒ |f(x) − L| &lt; ε</div>
                            </div>
                        )}
                    </div>
                    <div className="epsilon-card highlight">
                        <div className="epsilon-card-title">🎯 Challenge Mode</div>
                        <p className="epsilon-helper">جرّب اختيار ε ثم توقّع δ قبل أن تُحسب.</p>
                        <button className="epsilon-toggle-btn">ابدأ التحدي</button>
                    </div>
                </aside>
            </section>

            <div className="epsilon-ai-launcher">
                <button
                    className={`epsilon-ai-fab ${aiChatOpen ? "active" : ""}`}
                    onClick={() => setAiChatOpen(prev => !prev)}
                    title="شرح AI"
                >
                    <Sparkles size={18} />
                </button>
                <div className="epsilon-ai-label">شرح AI</div>
            </div>

            <ChatInterface
                open={aiChatOpen}
                onClose={() => setAiChatOpen(false)}
                context={{
                    epsilon,
                    delta,
                    pointA: activeModel.pointA,
                    limitL: activeModel.limitL,
                    expression: activeModel.expression
                }}
                onAction={applyAction}
                callMathAgentAPI={callMathAgentAPI}
                defaultReply={explanation.arabic}
            />
        </div>
    );
};

export default EpsilonDeltaRenderer;
