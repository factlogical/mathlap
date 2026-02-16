import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Maximize2, Minimize2, MessageSquare, SlidersHorizontal } from "lucide-react";
import { create, all } from "mathjs";
import DerivativeCanvas from "./components/DerivativeCanvas";
import DerivativeCanvas3D from "./components/DerivativeCanvas3D";
import DerivativeChat from "./components/DerivativeChat";
import ControlPanel from "./components/ControlPanel";
import { buildEngine, calculateData } from "./utils/derivativeEngine";
import { buildEngine3D, calculateTangentPlane } from "./utils/derivative3DEngine";
import { normalizeFunctionExpression, validateAction } from "./utils/actionValidator";
import "./DerivativeStudio.css";

const math = create(all);

const INITIAL_MESSAGES = [
    {
        role: "assistant",
        content: "Try commands like: plot sin(x), derivative of x^3 at 2, mode 3D, z = x^2 + y^2, b 1.2."
    }
];

const INITIAL_STATE = {
    mode: "2D",

    // 2D
    func: "x^2",
    a: 2,
    h: 1,
    xRange2D: [-5, 5],
    yRange2D: [-2, 10],

    // 3D
    func3D: "x^2 + y^2",
    b: 0,
    xDomain3D: [-5, 5],
    yDomain3D: [-5, 5],
    patchSize3D: 1.5,
    showSurface3D: true,
    showPlane3D: true,
    showNormal3D: true,
    cameraPreset3D: "iso",

    // Shared
    showSecant: true,
    showTangent: false,
    showTriangle: true,
    highlight: null,
    forcedVisible: { secant: false, tangent: false, triangle: false },
    messages: INITIAL_MESSAGES,
    isAnimating: false
};

const TOGGLE_KEY_MAP = {
    secant: "showSecant",
    tangent: "showTangent",
    triangle: "showTriangle",
    surface: "showSurface3D",
    plane: "showPlane3D",
    normal: "showNormal3D"
};

const FORCED_2D_KEYS = new Set(["secant", "tangent", "triangle"]);
const VALID_HIGHLIGHTS = new Set(["secant", "tangent", "triangle", "surface", "plane", "normal"]);
const TOGGLE_2D_ELEMENTS = new Set(["secant", "tangent", "triangle"]);
const TOGGLE_3D_ELEMENTS = new Set(["surface", "plane", "normal"]);
const NAMED_FUNCTION_TOKEN_RE = /\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|ln|sqrt|abs|exp)\b/i;
const PLOT_VERB_RE = /(?:plot|draw|graph|show|\u0627\u0631\u0633\u0645|\u0627\u0639\u0631\u0636|\u0627\u0638\u0647\u0631)/i;
const DERIVATIVE_VERB_RE = /(?:derivative|differentiate|\u0645\u0634\u062a\u0642|\u0627\u0634\u062a\u0642|\u062a\u0641\u0627\u0636\u0644)/i;
const PRONOUN_PLOT_RE = /^(?:plot it|draw it|show it|graph it|\u0627\u0631\u0633\u0645\u0647\u0627|\u0627\u0639\u0631\u0636\u0647\u0627|\u0627\u0638\u0647\u0631\u0647\u0627)$/i;
const AR_DERIVATIVE_DRAW_RE = /^(?:\u0627\u0631\u0633\u0645|\u0627\u0639\u0631\u0636|\u0627\u0638\u0647\u0631)\s+(?:\u0645\u0634\u062a\u0642(?:\u0629|\u0647)?)(?:\s+\u062f\u0627\u0644\u0629)?\s+(.+)$/i;
const AR_DERIVATIVE_ONLY_RE = /^(?:\u0645\u0634\u062a\u0642(?:\u0629|\u0647)?|\u0627\u0634\u062a\u0642)(?:\s+\u062f\u0627\u0644\u0629)?\s+(.+)$/i;
const AR_PLOT_FN_RE = /^(?:\u0627\u0631\u0633\u0645|\u0627\u0639\u0631\u0636|\u0627\u0638\u0647\u0631)\s+(?:\u062f\u0627\u0644\u0629\s+)?(.+)$/i;
const GUIDE_DISABLED_KEY = "derivative_studio_fullscreen_guide_disabled_v1";
const FULLSCREEN_GUIDE_CARDS = {
    "2D": [
        {
            id: "curve",
            title: "Function Curve",
            text: "The cyan curve is f(x). Drag the red and green points to inspect local behavior."
        },
        {
            id: "secant",
            title: "Secant And Tangent",
            text: "Yellow is secant slope over h. Cyan tangent is the limit view as h approaches zero."
        },
        {
            id: "triangle",
            title: "Delta Triangle",
            text: "The dashed triangle encodes ?x = h and ?y = f(a+h)-f(a)."
        },
        {
            id: "points",
            title: "Key Points",
            text: "Red point is (a, f(a)). Green point is (a+h, f(a+h))."
        }
    ],
    "3D": [
        {
            id: "surface",
            title: "Surface",
            text: "The mesh represents z = f(x, y). Move a and b to inspect nearby behavior."
        },
        {
            id: "plane",
            title: "Tangent Plane",
            text: "The tangent plane approximates the surface at the selected point."
        },
        {
            id: "normal",
            title: "Normal Vector",
            text: "The normal vector is perpendicular to the tangent plane."
        }
    ]
};

function safeH(value) {
    if (!Number.isFinite(value)) return 0.01;
    if (Math.abs(value) < 0.01) return value >= 0 ? 0.01 : -0.01;
    return value;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeArabicInput(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[ًٌٍَُِّْـ]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه");
}

function normalizeMathAliases(raw, mode = "2D") {
    let expr = String(raw || "")
        .replace(/[�]/g, "*")
        .replace(/[�]/g, "/")
        .replace(/[\u2212\u2013]/g, "-")
        .replace(/\u062c\u062a\u0627|\u062c\u064a\u0628\s*\u062a\u0645\u0627\u0645/gi, "cos")
        .replace(/\u062c\u0627/gi, "sin")
        .replace(/\u0638\u0627/gi, "tan")
        .replace(/\u0644\u0648\u063a\u0627\u0631\u064a\u062a\u0645|\u0644\u0648\u063a/gi, "log")
        .replace(/\u062c\u0630\u0631/gi, "sqrt")
        .replace(/\u0627\u0644\u0642\u064a\u0645\u0629\s*\u0627\u0644\u0645\u0637\u0644\u0642\u0629/gi, "abs")
        .replace(/\u0627\u0644\u0645\u0637\u0644\u0642\u0629|\u0645\u0637\u0644\u0642\u0629?/gi, "abs")
        .trim();

    if (mode === "3D" && !/\by\b/i.test(expr) && /\bu\b/i.test(expr)) {
        expr = expr.replace(/\bu\b/gi, "y");
    }

    return expr;
}

function maybeWrapSingleFunctionToken(expr) {
    const token = String(expr || "").trim();
    if (/^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|ln|sqrt|abs|exp)$/i.test(token)) {
        return `${token}(x)`;
    }
    return token;
}

function deriveExpressionWrtX(baseExpression) {
    const normalizedBase = maybeWrapSingleFunctionToken(
        normalizeFunctionExpression(normalizeMathAliases(baseExpression, "2D"))
    );
    if (!normalizedBase) return null;
    try {
        const derivativeNode = math.derivative(normalizedBase, "x");
        const derived = normalizeFunctionExpression(derivativeNode.toString()).slice(0, 120).trim();
        return derived || null;
    } catch {
        return null;
    }
}
function cleanLocalFunctionExpression(raw) {
    if (!raw) return null;
    let expr = String(raw).trim();
    expr = expr.replace(/^f\(x\)\s*=\s*/i, "");
    expr = expr.replace(/^y\s*=\s*/i, "");
    expr = expr.replace(/[“”"']/g, "").trim();
    expr = normalizeMathAliases(expr, "2D");
    expr = expr
        .replace(/\|([^|]+)\|/g, "abs($1)")
        .replace(/\b(abs|sin|cos|tan|log|sqrt|exp)\s*(?:\u0644|\u0644\u0640)\s*([xy])\b/gi, "$1($2)")
        .replace(/\babs\s*(?:of|\u0644|\u0644\u0640)\s*\(?\s*x\s*\)?/gi, "abs(x)")
        .replace(/\babs\s*(?:of|\u0644|\u0644\u0640)\s*\(?\s*y\s*\)?/gi, "abs(y)");
    expr = normalizeFunctionExpression(expr);
    expr = maybeWrapSingleFunctionToken(expr);
    if (!expr) return null;
    return expr.slice(0, 120);
}

function cleanLocalFunctionExpression3D(raw) {
    if (!raw) return null;
    let expr = String(raw).trim();
    expr = expr.replace(/^f\(x,\s*y\)\s*=\s*/i, "");
    expr = expr.replace(/^z\s*=\s*/i, "");
    expr = expr.replace(/[“”"']/g, "").trim();
    expr = normalizeMathAliases(expr, "3D");
    expr = normalizeFunctionExpression(expr);
    if (!expr) return null;
    return expr.slice(0, 120);
}

function extractDerivativeTarget(rawText, currentFunction) {
    const raw = String(rawText || "").trim();
    if (!raw) return null;

    let target = raw
        .replace(/^(?:draw|plot|graph|show)\s+(?:the\s+)?derivative(?:\s+of)?\s*/i, "")
        .replace(/^(?:derivative|differentiate)\s+(?:of\s+)?/i, "")
        .replace(/^(?:\u0627\u0631\u0633\u0645|\u0627\u0639\u0631\u0636|\u0627\u0638\u0647\u0631)\s+(?:\u0645\u0634\u062a\u0642(?:\u0629|\u0647)?)(?:\s+\u062f\u0627\u0644\u0629)?\s*/i, "")
        .replace(/^(?:\u0645\u0634\u062a\u0642(?:\u0629|\u0647)?|\u0627\u0634\u062a\u0642)(?:\s+\u062f\u0627\u0644\u0629)?\s*/i, "")
        .replace(/\s+(?:at|when\s+x=)\s*-?\d+(?:\.\d+)?\s*$/i, "")
        .replace(/\s+\u0639\u0646\u062f\s+-?\d+(?:\.\d+)?\s*$/i, "")
        .trim();

    const isCurrentRef = /^(?:it|this|this function|the function|\u0647\u0630\u0647|\u0647\u0630\u0647\s+\u062f\u0627\u0644\u0629|\u0647\u0630\u0647\s+\u0627\u0644\u062f\u0627\u0644\u0629|\u0627\u0644\u062f\u0627\u0644\u0629|\u0627\u0644\u062f\u0627\u0644\u0629\s+\u0627\u0644\u062d\u0627\u0644\u064a\u0629|\u0645\u0634\u062a\u0642\u062a\u0647\u0627|\u0627\u0634\u062a\u0642\u0647\u0627)$/i.test(target);
    if (!target || isCurrentRef) {
        return cleanLocalFunctionExpression(currentFunction);
    }

    return cleanLocalFunctionExpression(target);
}

function inferRecentDerivativeExpression(messages, currentFunction) {
    if (!Array.isArray(messages) || messages.length === 0) return null;

    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const msg = messages[i];
        if (!msg || msg.role !== "user") continue;
        const content = String(msg.content || "").trim();
        if (!content || !DERIVATIVE_VERB_RE.test(content)) continue;

        const target = extractDerivativeTarget(content, currentFunction);
        if (!target) continue;

        const derived = deriveExpressionWrtX(target);
        if (derived) return derived;
    }

    return null;
}

function autoYRangeFor2D(engine, xRange) {
    if (!engine || typeof engine.evalF !== "function" || !Array.isArray(xRange) || xRange.length !== 2) {
        return null;
    }

    const xMin = Number(xRange[0]);
    const xMax = Number(xRange[1]);
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) return null;

    const ys = [];
    const samples = 240;
    for (let i = 0; i <= samples; i += 1) {
        const x = xMin + ((xMax - xMin) * i) / samples;
        const y = engine.evalF(x);
        if (Number.isFinite(y) && Math.abs(y) <= 1e6) ys.push(y);
    }
    if (ys.length < 8) return null;

    ys.sort((a, b) => a - b);
    const q = (p) => ys[Math.min(ys.length - 1, Math.max(0, Math.floor((ys.length - 1) * p)))];
    let low = q(0.05);
    let high = q(0.95);

    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    if (high <= low) {
        const center = (high + low) / 2;
        low = center - 1;
        high = center + 1;
    }

    const span = Math.max(high - low, 0.5);
    const pad = span * 0.2;
    const yMin = Math.max(-1e4, low - pad);
    const yMax = Math.min(1e4, high + pad);

    if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax <= yMin) return null;
    return [yMin, yMax];
}

function highlightFromAction(action) {
    if (!action || typeof action !== "object") return null;
    if (action.type === "toggle") {
        const element = action.params?.element;
        return VALID_HIGHLIGHTS.has(element) ? element : null;
    }
    if (action.type === "set_mode") return action.params?.mode === "3D" ? "surface" : "tangent";
    if (action.type === "animate") return "secant";
    if (action.type === "set_h") return "secant";
    if (action.type === "move_point") return "tangent";
    if (action.type === "set_b") return "normal";
    if (action.type === "change_function") return "tangent";
    if (action.type === "change_function_3d") return "surface";
    return null;
}

function inferActionMode(action) {
    if (!action || typeof action !== "object") return null;

    if (action.type === "set_mode") {
        const mode = String(action.params?.mode || "").toUpperCase();
        return mode === "2D" || mode === "3D" ? mode : null;
    }

    if (action.type === "toggle") {
        const element = String(action.params?.element || "").toLowerCase();
        if (TOGGLE_2D_ELEMENTS.has(element)) return "2D";
        if (TOGGLE_3D_ELEMENTS.has(element)) return "3D";
        return null;
    }

    if (action.type === "change_function" || action.type === "set_h" || action.type === "animate" || action.type === "set_range") {
        return "2D";
    }
    if (action.type === "change_function_3d" || action.type === "set_b") {
        return "3D";
    }

    if (action.type === "multi_step") {
        const steps = Array.isArray(action.params?.steps) ? action.params.steps : [];
        for (const step of steps) {
            const mode = inferActionMode(step?.action);
            if (mode) return mode;
        }
    }

    return null;
}

function adaptActionForCurrentMode(action, currentMode) {
    if (action?.type === "set_mode") return action;
    const activeMode = String(currentMode || "").toUpperCase() === "3D" ? "3D" : "2D";
    const targetMode = inferActionMode(action);
    if (!targetMode || targetMode === activeMode) return action;

    return {
        type: "multi_step",
        params: {
            steps: [
                { action: { type: "set_mode", params: { mode: targetMode } }, delay: 0 },
                { action, delay: 60 }
            ]
        }
    };
}

export default function DerivativeStudioRenderer() {
    const [state, setState] = useState(INITIAL_STATE);
    const [nativeFullscreen, setNativeFullscreen] = useState(false);
    const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
    const [showOverlayChat, setShowOverlayChat] = useState(false);
    const [showOverlayControls, setShowOverlayControls] = useState(false);
    const [guideDisabled, setGuideDisabled] = useState(() => {
        try {
            return window.localStorage.getItem(GUIDE_DISABLED_KEY) === "1";
        } catch {
            return false;
        }
    });
    const [showFullscreenGuide, setShowFullscreenGuide] = useState(false);
    const [dismissedGuideCards, setDismissedGuideCards] = useState({});
    const rootRef = useRef(null);

    const engine2D = useMemo(() => buildEngine(state.func), [state.func]);
    const data2D = useMemo(
        () => (engine2D.error ? null : calculateData(engine2D, state.a, state.h)),
        [engine2D, state.a, state.h]
    );

    const engine3D = useMemo(() => buildEngine3D(state.func3D), [state.func3D]);
    const data3D = useMemo(
        () => (engine3D.error
            ? { error: engine3D.error }
            : calculateTangentPlane(engine3D, state.a, state.b, state.patchSize3D)),
        [engine3D, state.a, state.b, state.patchSize3D]
    );
    const animatingH = useRef(state.h);
    const animationFrame = useRef(null);
    const highlightTimeout = useRef(null);
    const highlightKeyRef = useRef(null);
    const last2DFunctionRef = useRef(INITIAL_STATE.func);
    const isFullscreen = nativeFullscreen || fallbackFullscreen;
    const guideCards = state.mode === "3D" ? FULLSCREEN_GUIDE_CARDS["3D"] : FULLSCREEN_GUIDE_CARDS["2D"];
    const visibleGuideCards = guideCards.filter((card) => !dismissedGuideCards[card.id]);

    useEffect(() => {
        if (!state.isAnimating) {
            animatingH.current = state.h;
        }
    }, [state.h, state.isAnimating]);

    useEffect(() => {
        const handleFsChange = () => {
            const active = document.fullscreenElement === rootRef.current;
            setNativeFullscreen(active);
            if (!active) {
                setShowOverlayChat(false);
                setShowOverlayControls(false);
            }
        };

        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    useEffect(() => {
        if (!isFullscreen) {
            setShowOverlayChat(false);
            setShowOverlayControls(false);
        }
    }, [isFullscreen]);

    useEffect(() => {
        if (isFullscreen && !guideDisabled) {
            setShowFullscreenGuide(true);
            setDismissedGuideCards({});
        }
    }, [isFullscreen, state.mode, guideDisabled]);

    useEffect(() => {
        if (showFullscreenGuide && visibleGuideCards.length === 0) {
            setShowFullscreenGuide(false);
        }
    }, [showFullscreenGuide, visibleGuideCards.length]);

    const setGuideDisabledPersisted = (nextValue) => {
        setGuideDisabled(nextValue);
        try {
            if (nextValue) {
                window.localStorage.setItem(GUIDE_DISABLED_KEY, "1");
            } else {
                window.localStorage.removeItem(GUIDE_DISABLED_KEY);
            }
        } catch {
            // no-op on storage failure
        }
    };

    const dismissGuideCard = (cardId) => {
        setDismissedGuideCards((prev) => ({
            ...prev,
            [cardId]: true
        }));
    };

    const applyHighlight = (value, options = {}) => {
        const { duration = 2200, ensureVisible = false } = options;
        const normalized = typeof value === "string" ? value.toLowerCase() : null;
        if (!VALID_HIGHLIGHTS.has(normalized)) return;

        if (highlightTimeout.current) {
            clearTimeout(highlightTimeout.current);
            highlightTimeout.current = null;
        }

        setState((prev) => ({
            ...prev,
            highlight: normalized,
            forcedVisible: (() => {
                if (!ensureVisible || !FORCED_2D_KEYS.has(normalized)) return prev.forcedVisible;
                const nextForced = { ...prev.forcedVisible };
                const previous = highlightKeyRef.current;
                if (previous && previous !== normalized && FORCED_2D_KEYS.has(previous)) {
                    nextForced[previous] = false;
                }
                nextForced[normalized] = true;
                return nextForced;
            })()
        }));

        if (ensureVisible && FORCED_2D_KEYS.has(normalized)) {
            highlightKeyRef.current = normalized;
        }

        highlightTimeout.current = setTimeout(() => {
            setState((prev) => ({
                ...prev,
                highlight: null,
                forcedVisible: (() => {
                    if (!ensureVisible || !FORCED_2D_KEYS.has(normalized)) return prev.forcedVisible;
                    const nextForced = { ...prev.forcedVisible };
                    nextForced[normalized] = false;
                    return nextForced;
                })()
            }));
            highlightTimeout.current = null;
            if (highlightKeyRef.current === normalized) {
                highlightKeyRef.current = null;
            }
        }, duration);
    };

    const startAnimation = ({ from, to, duration }) => {
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
        }

        const fromH = safeH(from);
        const toH = safeH(to);
        const durationMs = Math.max(500, Math.min(10000, Number(duration) || 2000));

        animatingH.current = fromH;
        setState((prev) => ({ ...prev, mode: "2D", isAnimating: true, h: fromH }));

        const startTime = performance.now();
        let lastStateUpdate = startTime;

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = 1 - (1 - progress) ** 3;
            const currentH = fromH + (toH - fromH) * eased;

            animatingH.current = currentH;

            if (now - lastStateUpdate >= 80 || progress >= 1) {
                setState((prev) => ({ ...prev, h: currentH }));
                lastStateUpdate = now;
            }

            if (progress < 1) {
                animationFrame.current = requestAnimationFrame(animate);
                return;
            }

            animationFrame.current = null;
            setState((prev) => ({
                ...prev,
                h: toH,
                isAnimating: false,
                showTangent: true
            }));
        };

        animationFrame.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        return () => {
            if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
            if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
            highlightKeyRef.current = null;
        };
    }, []);

    const executeAction = (action) => {
        if (!action || typeof action !== "object") return { applied: false, reason: "empty_action" };
        if (action.type === "multi_step") {
            const steps = Array.isArray(action.params?.steps) ? action.params.steps : [];
            let appliedAny = false;
            steps.forEach((step) => {
                if (!step || typeof step !== "object") return;
                const delay = Math.max(0, Number(step.delay) || 0);
                const stepAction = step.action;
                if (!stepAction) return;
                if (delay > 0) {
                    setTimeout(() => executeAction(stepAction), delay);
                    appliedAny = true;
                } else {
                    const result = executeAction(stepAction);
                    if (result?.applied) appliedAny = true;
                }
            });
            return { applied: appliedAny, reason: appliedAny ? undefined : "empty_steps" };
        }

        const validated = validateAction(action, state);
        if (!validated) return { applied: false, reason: "invalid_action" };

        switch (validated.type) {
            case "set_mode":
                setState((prev) => ({
                    ...prev,
                    mode: validated.params.mode,
                    isAnimating: validated.params.mode === "3D" ? false : prev.isAnimating
                }));
                return { applied: true };

            case "change_function": {
                const probe = buildEngine(validated.params.func);
                const sampleA = Number.isFinite(validated.params.a) ? validated.params.a : state.a;
                const sample1 = probe?.evalF?.(sampleA);
                const sample2 = probe?.evalF?.(sampleA + 0.73);
                if (probe?.error || (!Number.isFinite(sample1) && !Number.isFinite(sample2))) {
                    return { applied: false, reason: "invalid_2d_expression" };
                }

                last2DFunctionRef.current = validated.params.func;
                setState((prev) => ({
                    ...prev,
                    mode: "2D",
                    func: validated.params.func,
                    a: validated.params.a,
                    yRange2D: autoYRangeFor2D(probe, prev.xRange2D) || prev.yRange2D
                }));
                return { applied: true };
            }

            case "change_function_3d": {
                const probe = buildEngine3D(validated.params.func3D);
                const sampleA = Number.isFinite(validated.params.a) ? validated.params.a : state.a;
                const sampleB = Number.isFinite(validated.params.b) ? validated.params.b : state.b;
                const sample1 = probe?.evalF?.(sampleA, sampleB);
                const sample2 = probe?.evalF?.(sampleA + 0.61, sampleB - 0.47);
                if (probe?.error || (!Number.isFinite(sample1) && !Number.isFinite(sample2))) {
                    return { applied: false, reason: "invalid_3d_expression" };
                }

                setState((prev) => ({
                    ...prev,
                    mode: "3D",
                    func3D: validated.params.func3D,
                    a: validated.params.a,
                    b: validated.params.b
                }));
                return { applied: true };
            }

            case "set_h":
                setState((prev) => ({ ...prev, h: validated.params.h }));
                return { applied: true };

            case "move_point":
                setState((prev) => ({ ...prev, a: validated.params.a }));
                return { applied: true };

            case "set_b":
                setState((prev) => ({ ...prev, b: validated.params.b }));
                return { applied: true };

            case "set_range":
                setState((prev) => ({
                    ...prev,
                    xRange2D: validated.params.xRange,
                    yRange2D: validated.params.yRange
                }));
                return { applied: true };

            case "animate":
                startAnimation(validated.params);
                return { applied: true };

            case "toggle": {
                const key = TOGGLE_KEY_MAP[validated.params.element];
                if (!key) return { applied: false, reason: "invalid_toggle_target" };
                setState((prev) => ({
                    ...prev,
                    [key]: validated.params.show
                }));
                return { applied: true };
            }

            default:
                return { applied: false, reason: "unsupported_action" };
        }
    };

    const tryLocalCommand = (text) => {
        const raw = String(text || "").trim();
        const t = raw.toLowerCase();
        const ar = normalizeArabicInput(raw);

        if (PRONOUN_PLOT_RE.test(raw)) {
            const recentDerivative = inferRecentDerivativeExpression(state.messages, state.func);
            if (recentDerivative) {
                return { type: "change_function", params: { func: recentDerivative, a: state.a } };
            }
            if (last2DFunctionRef.current) {
                return { type: "change_function", params: { func: last2DFunctionRef.current, a: state.a } };
            }
        }

        const namedToken = raw.match(NAMED_FUNCTION_TOKEN_RE);
        if (namedToken) {
            const token = namedToken[1].toLowerCase();
            if (DERIVATIVE_VERB_RE.test(raw)) {
                const derived = deriveExpressionWrtX(token);
                if (derived) return { type: "change_function", params: { func: derived, a: state.a } };
            }
            if (PLOT_VERB_RE.test(raw)) {
                return {
                    type: "change_function",
                    params: { func: maybeWrapSingleFunctionToken(token), a: state.a }
                };
            }
        }

        const cameraMatch = t.match(/^camera\s+(iso|top|front|side)$/);
        if (cameraMatch) {
            return { type: "local_camera", preset: cameraMatch[1] };
        }

        const modeMatch = t.match(/^(?:mode|view)\s*(?:=|\s)\s*(2d|3d)$/i);
        if (modeMatch) {
            return { type: "set_mode", params: { mode: modeMatch[1].toUpperCase() } };
        }
        if (/(?:وضع|نمط).*(?:3d|ثلاثي)/.test(ar)) {
            return { type: "set_mode", params: { mode: "3D" } };
        }
        if (/(?:وضع|نمط).*(?:2d|ثنائي)/.test(ar)) {
            return { type: "set_mode", params: { mode: "2D" } };
        }

        const hm = t.match(/^h\s*(?:=|\s)\s*(-?\d+(?:\.\d+)?)$/);
        if (hm) return { type: "set_h", params: { h: parseFloat(hm[1]) } };

        const am = t.match(/^a\s*(?:=|\s)\s*(-?\d+(?:\.\d+)?)$/);
        if (am) return { type: "move_point", params: { a: parseFloat(am[1]) } };

        const bm = t.match(/^b\s*(?:=|\s)\s*(-?\d+(?:\.\d+)?)$/);
        if (bm) return { type: "set_b", params: { b: parseFloat(bm[1]) } };

        const arSetH = ar.match(/^(?:اجعل|خلي)\s*h\s*(?:=|الى)?\s*(-?\d+(?:\.\d+)?)$/);
        if (arSetH) return { type: "set_h", params: { h: parseFloat(arSetH[1]) } };

        const arMoveA = ar.match(/^(?:حرك|حرّك)\s*a?\s*(?:الى)?\s*(-?\d+(?:\.\d+)?)$/);
        if (arMoveA) return { type: "move_point", params: { a: parseFloat(arMoveA[1]) } };

        const arMoveB = ar.match(/^(?:حرك|حرّك)\s*b\s*(?:الى)?\s*(-?\d+(?:\.\d+)?)$/);
        if (arMoveB) return { type: "set_b", params: { b: parseFloat(arMoveB[1]) } };

        const eng2DDerivative = raw.match(/derivative\s+of\s+(.+?)\s+at\s+(-?\d+(?:\.\d+)?)/i);
        if (eng2DDerivative) {
            const func = cleanLocalFunctionExpression(eng2DDerivative[1]);
            const a = parseFloat(eng2DDerivative[2]);
            if (func && Number.isFinite(a)) return { type: "change_function", params: { func, a } };
        }

        const arDerivative = ar.match(/^اشتق\s+(.+?)\s+عند\s+(-?\d+(?:\.\d+)?)$/);
        if (arDerivative) {
            const func = cleanLocalFunctionExpression(arDerivative[1]);
            const a = parseFloat(arDerivative[2]);
            if (func && Number.isFinite(a)) return { type: "change_function", params: { func, a } };
        }

        const derivativeTarget = extractDerivativeTarget(raw, state.func);
        if (derivativeTarget && DERIVATIVE_VERB_RE.test(raw)) {
            const derived = deriveExpressionWrtX(derivativeTarget);
            if (derived) return { type: "change_function", params: { func: derived, a: state.a } };
        }

        const engDerivativeDraw = raw.match(/^(?:draw|plot|graph|show)\s+(?:the\s+)?derivative(?:\s+of)?\s+(.+)$/i);
        if (engDerivativeDraw) {
            const derived = deriveExpressionWrtX(engDerivativeDraw[1]);
            if (derived) return { type: "change_function", params: { func: derived, a: state.a } };
        }

        const engDerivativeOnly = raw.match(/^(?:derivative|differentiate)\s+(.+)$/i);
        if (engDerivativeOnly) {
            const derived = deriveExpressionWrtX(engDerivativeOnly[1]);
            if (derived) return { type: "change_function", params: { func: derived, a: state.a } };
        }

        const arDerivativeDraw = raw.match(AR_DERIVATIVE_DRAW_RE);
        if (arDerivativeDraw) {
            const derived = deriveExpressionWrtX(arDerivativeDraw[1]);
            if (derived) return { type: "change_function", params: { func: derived, a: state.a } };
        }

        const arDerivativeOnly = raw.match(AR_DERIVATIVE_ONLY_RE);
        if (arDerivativeOnly) {
            const derived = deriveExpressionWrtX(arDerivativeOnly[1]);
            if (derived) return { type: "change_function", params: { func: derived, a: state.a } };
        }

        const function3DExplicit = raw.match(/^(?:f\(x,\s*y\)|z)\s*=\s*(.+)$/i);
        if (function3DExplicit) {
            const func3D = cleanLocalFunctionExpression3D(function3DExplicit[1]);
            if (func3D) return { type: "change_function_3d", params: { func3D, a: state.a, b: state.b } };
        }

        const surfaceCmd = raw.match(/^surface\s+(.+)$/i) || raw.match(/^plot3d\s+(.+)$/i);
        if (surfaceCmd) {
            const func3D = cleanLocalFunctionExpression3D(surfaceCmd[1]);
            if (func3D) return { type: "change_function_3d", params: { func3D, a: state.a, b: state.b } };
        }

        const arSurfaceCmd = ar.match(/^(?:ارسم|اعرض)\s+(?:سطح|ثري دي|3d)\s+(.+)$/);
        if (arSurfaceCmd) {
            const func3D = cleanLocalFunctionExpression3D(arSurfaceCmd[1]);
            if (func3D) return { type: "change_function_3d", params: { func3D, a: state.a, b: state.b } };
        }

        const arPlot = raw.match(AR_PLOT_FN_RE);
        if (arPlot) {
            const rawExpr = arPlot[1];
            if (/\by\b/.test(rawExpr) || rawExpr.includes(",")) {
                const func3D = cleanLocalFunctionExpression3D(rawExpr);
                if (func3D) return { type: "change_function_3d", params: { func3D, a: state.a, b: state.b } };
            }
            const func = cleanLocalFunctionExpression(rawExpr);
            if (func) return { type: "change_function", params: { func, a: state.a } };
        }

        if (/^(?:ورني|وريني|ارني|اريني|اظهر|اعرض)\s+(?:ال)?قاطع$/.test(ar)) {
            return { type: "toggle", params: { element: "secant", show: true } };
        }
        if (/^(?:ورني|وريني|ارني|اريني|اظهر|اعرض)\s+(?:ال)?مماس$/.test(ar)) {
            return { type: "toggle", params: { element: "tangent", show: true } };
        }
        if (/^(?:ورني|وريني|ارني|اريني|اظهر|اعرض)\s+(?:ال)?مثلث$/.test(ar)) {
            return { type: "toggle", params: { element: "triangle", show: true } };
        }
        if (/^(?:ورني|وريني|ارني|اريني|اظهر|اعرض)\s+(?:ال)?مستوى/.test(ar)) {
            return { type: "toggle", params: { element: "plane", show: true } };
        }
        if (/^(?:ورني|وريني|ارني|اريني|اظهر|اعرض)\s+(?:ال)?عمودي/.test(ar)) {
            return { type: "toggle", params: { element: "normal", show: true } };
        }

        if (t === "animate") {
            return { type: "animate", params: { from: state.h, to: 0.01, duration: 2500 } };
        }
        if (/(?:ورني|وريني|ارني|اريني).*(?:القاطع).*(?:مماس|المماس)/.test(ar)) {
            return { type: "animate", params: { from: state.h, to: 0.01, duration: 2500 } };
        }

        const tog = t.match(/^toggle\s+(secant|tangent|triangle|surface|plane|normal)$/);
        if (tog) {
            const element = tog[1];
            const key = TOGGLE_KEY_MAP[element];
            const current = key ? state[key] : false;
            return { type: "toggle", params: { element, show: !current } };
        }

        const explicitToggle = t.match(/^(secant|tangent|triangle|surface|plane|normal)\s+(on|off)$/);
        if (explicitToggle) {
            return {
                type: "toggle",
                params: {
                    element: explicitToggle[1],
                    show: explicitToggle[2] === "on"
                }
            };
        }

        const arabicToggle = ar.match(/^(سطح|مستوى|عمودي)\s+(on|off|تشغيل|ايقاف|إيقاف)$/);
        if (arabicToggle) {
            const token = arabicToggle[1];
            const element = token === "مستوى" ? "plane" : token === "عمودي" ? "normal" : "surface";
            return {
                type: "toggle",
                params: {
                    element,
                    show: arabicToggle[2] === "on" || arabicToggle[2] === "تشغيل"
                }
            };
        }

        return null;
    };

    const handleQuickAction = (command) => {
        if (command && typeof command === "object" && typeof command.type === "string") {
            const adapted = adaptActionForCurrentMode(command, state.mode);
            const result = executeAction(adapted);
            const highlight = highlightFromAction(command);
            if (result?.applied && highlight) applyHighlight(highlight, { duration: 1800, ensureVisible: true });
            if (!result?.applied) {
                setState((prev) => ({
                    ...prev,
                    messages: [
                        ...prev.messages,
                        {
                            role: "assistant",
                            content: "Quick action failed to apply. Try a cleaner expression like cos(x) or x^4.",
                            error: true
                        }
                    ]
                }));
            }
            return;
        }

        let action = null;
        if (command === "show_tangent") {
            action = { type: "toggle", params: { element: "tangent", show: true } };
        } else if (command === "animate") {
            action = { type: "animate", params: { from: state.h, to: 0.01, duration: 2500 } };
        } else if (command === "try_a_minus_1") {
            action = { type: "move_point", params: { a: -1 } };
        } else if (command === "mode_3d") {
            action = { type: "set_mode", params: { mode: "3D" } };
        }

        if (!action) return;
        const adapted = adaptActionForCurrentMode(action, state.mode);
        const result = executeAction(adapted);
        const fallbackHighlight = highlightFromAction(action);
        if (result?.applied && fallbackHighlight) applyHighlight(fallbackHighlight, { duration: 1600, ensureVisible: true });
        if (!result?.applied) {
            setState((prev) => ({
                ...prev,
                messages: [
                    ...prev.messages,
                    {
                        role: "assistant",
                        content: "Quick action failed to apply. Try a clearer command.",
                        error: true
                    }
                ]
            }));
        }
    };

    const resetStudio = () => {
        setState({
            ...INITIAL_STATE,
            messages: INITIAL_MESSAGES
        });
        last2DFunctionRef.current = INITIAL_STATE.func;
        animatingH.current = INITIAL_STATE.h;
    };

    const toggleFullscreen = async () => {
        const root = rootRef.current;
        if (!root) return;

        if (!document.fullscreenEnabled || typeof root.requestFullscreen !== "function") {
            setFallbackFullscreen((prev) => !prev);
            return;
        }

        try {
            if (document.fullscreenElement === root) {
                await document.exitFullscreen();
            } else {
                await root.requestFullscreen();
            }
        } catch {
            setFallbackFullscreen((prev) => !prev);
        }
    };

    const handleCanvasPointDrag = ({ type, x }) => {
        setState((prev) => {
            if (prev.mode !== "2D") return prev;
            const minX = prev.xRange2D[0];
            const maxX = prev.xRange2D[1];
            const nextX = clamp(Number(x), minX, maxX);
            if (!Number.isFinite(nextX)) return prev;

            if (type === "a") {
                return {
                    ...prev,
                    a: nextX
                };
            }

            if (type === "b") {
                return {
                    ...prev,
                    h: safeH(nextX - prev.a)
                };
            }

            return prev;
        });
    };

    const handleSendMessage = async (text) => {
        const userMsg = { role: "user", content: text };
        setState((prev) => ({
            ...prev,
            messages: [...prev.messages, userMsg]
        }));

        const local = tryLocalCommand(text);
        if (local) {
            if (local.type === "local_camera") {
                setState((prev) => ({ ...prev, mode: "3D", cameraPreset3D: local.preset }));
                setState((prev) => ({
                    ...prev,
                    messages: [
                        ...prev.messages,
                        { role: "assistant", content: `Camera preset switched to ${local.preset}.` }
                    ]
                }));
                return;
            }

            const adaptedLocal = adaptActionForCurrentMode(local, state.mode);
            const localResult = executeAction(adaptedLocal);
            const localHighlight = highlightFromAction(local);
            if (localResult?.applied && localHighlight) {
                applyHighlight(localHighlight, { duration: 1600, ensureVisible: true });
            }

            const failedMessage = (() => {
                if (localResult?.reason === "invalid_2d_expression") {
                    return "I could not parse that 2D expression. Try forms like `cos(x)`, `x^3`, or `draw derivative of cos(x)`.";
                }
                if (localResult?.reason === "invalid_3d_expression") {
                    return "I could not parse that 3D surface. Use only x and y variables, like `z = x^2 + y^2`.";
                }
                return "I could not apply this command directly. Try a clearer function format.";
            })();

            setState((prev) => ({
                ...prev,
                messages: [
                    ...prev.messages,
                    {
                        role: "assistant",
                        content: localResult?.applied
                            ? "Command applied directly inside Derivative Studio."
                            : failedMessage,
                        error: !localResult?.applied
                    }
                ]
            }));
            return;
        }

        try {
            const response = await fetch("http://localhost:3002/api/interpret", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    mode: "derivative_chat",
                    context: {
                        mode: state.mode,
                        func: state.func,
                        a: state.a,
                        h: state.h,
                        slope_secant: data2D?.slope_secant,
                        slope_tangent: data2D?.slope_tangent,
                        isDerivableAtA: data2D?.isDerivableAtA,
                        func3D: state.func3D,
                        b: state.b,
                        z0: data3D?.z0,
                        fx: data3D?.dfx,
                        fy: data3D?.dfy,
                        patchSize3D: state.patchSize3D,
                        showSurface3D: state.showSurface3D,
                        showPlane3D: state.showPlane3D,
                        showNormal3D: state.showNormal3D,
                        cameraPreset3D: state.cameraPreset3D
                    }
                })
            });

            if (!response.ok) throw new Error(`Server ${response.status}`);

            const result = await response.json();
            const assistantMsg = {
                role: "assistant",
                content: result.explanation || "I could not understand that request clearly. Try a shorter prompt.",
                steps: result.steps,
                hint: result.hint,
                suggested_actions: Array.isArray(result.suggested_actions) ? result.suggested_actions : [],
                quick_actions: Array.isArray(result.quick_actions) ? result.quick_actions : []
            };

            setState((prev) => ({
                ...prev,
                messages: [...prev.messages, assistantMsg]
            }));

            const backendActionResult = result.action ? executeAction(result.action) : null;

            if (result.highlight) {
                applyHighlight(result.highlight, { duration: 3000, ensureVisible: true });
            } else {
                const fallbackHighlight = highlightFromAction(result.action);
                if (fallbackHighlight) {
                    applyHighlight(fallbackHighlight, { duration: 2200, ensureVisible: true });
                }
            }

            if (result.action && !backendActionResult?.applied) {
                setState((prev) => ({
                    ...prev,
                    messages: [
                        ...prev.messages,
                        {
                            role: "assistant",
                            content: "I understood your request, but the generated expression was invalid for the current view. Try `cos(x)` for 2D or `z = x^2 + y^2` for 3D.",
                            error: true
                        }
                    ]
                }));
            }
        } catch {
            setState((prev) => ({
                ...prev,
                messages: [
                    ...prev.messages,
                    { role: "assistant", content: "Failed to connect to derivative chat backend.", error: true }
                ]
            }));
        }
    };

    return (
        <div ref={rootRef} className={`derivative-studio ${isFullscreen ? "derivative-fullscreen" : ""}`}>
            <div className="canvas-section derivative-canvas-section">
                <div className="derivative-canvas-toolbar">
                    <div className="derivative-canvas-hint">
                        {state.mode === "2D"
                            ? "Drag red/green points directly on the graph."
                            : "Use mouse drag to orbit 3D view. Zoom with wheel."}
                    </div>
                    <div className="derivative-canvas-toolbar-actions">
                        {isFullscreen && (
                            <>
                                <button
                                    type="button"
                                    className={`derivative-toolbar-btn ${showFullscreenGuide ? "active" : ""}`}
                                    onClick={() => {
                                        if (guideDisabled) {
                                            setGuideDisabledPersisted(false);
                                            setDismissedGuideCards({});
                                            setShowFullscreenGuide(true);
                                        } else {
                                            setShowFullscreenGuide((prev) => !prev);
                                        }
                                    }}
                                    title="Toggle tutorial cards"
                                >
                                    <Info size={16} />
                                    Guide
                                </button>
                                <button
                                    type="button"
                                    className={`derivative-toolbar-btn ${showOverlayControls ? "active" : ""}`}
                                    onClick={() => setShowOverlayControls((prev) => !prev)}
                                    title="Toggle controls"
                                >
                                    <SlidersHorizontal size={16} />
                                    Controls
                                </button>
                                <button
                                    type="button"
                                    className={`derivative-toolbar-btn ${showOverlayChat ? "active" : ""}`}
                                    onClick={() => setShowOverlayChat((prev) => !prev)}
                                    title="Toggle chat overlay"
                                >
                                    <MessageSquare size={16} />
                                    Chat
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            className="derivative-toolbar-btn derivative-toolbar-btn-primary"
                            onClick={toggleFullscreen}
                            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            {isFullscreen ? "Exit" : "Fullscreen"}
                        </button>
                    </div>
                </div>

                {isFullscreen && showFullscreenGuide && !guideDisabled && (
                    <section className="derivative-guide-panel" aria-label="Fullscreen guide">
                        <div className="derivative-guide-header">
                            <h4>Live Reading Guide</h4>
                            <button
                                type="button"
                                className="derivative-guide-close"
                                onClick={() => setShowFullscreenGuide(false)}
                            >
                                Hide
                            </button>
                        </div>
                        <div className="derivative-guide-cards">
                            {visibleGuideCards.map((card) => (
                                <article key={card.id} className="derivative-guide-card">
                                    <div className="derivative-guide-card-head">
                                        <strong>{card.title}</strong>
                                        <button
                                            type="button"
                                            className="derivative-guide-card-dismiss"
                                            onClick={() => dismissGuideCard(card.id)}
                                            aria-label={`Dismiss ${card.title}`}
                                        >
                                            x
                                        </button>
                                    </div>
                                    <p>{card.text}</p>
                                </article>
                            ))}
                        </div>
                        <div className="derivative-guide-footer">
                            <label className="derivative-guide-disable">
                                <input
                                    type="checkbox"
                                    checked={guideDisabled}
                                    onChange={(event) => {
                                        const next = event.target.checked;
                                        setGuideDisabledPersisted(next);
                                        if (next) setShowFullscreenGuide(false);
                                    }}
                                />
                                Do not show again
                            </label>
                            <button
                                type="button"
                                className="derivative-guide-reset"
                                onClick={() => setDismissedGuideCards({})}
                            >
                                Reset Cards
                            </button>
                        </div>
                    </section>
                )}

                {state.mode === "2D" ? (
                    <DerivativeCanvas
                        engine={engine2D}
                        data={data2D}
                        a={state.a}
                        h={state.isAnimating ? animatingH.current : state.h}
                        xRange={state.xRange2D}
                        yRange={state.yRange2D}
                        showSecant={state.showSecant}
                        showTangent={state.showTangent}
                        showTriangle={state.showTriangle}
                        highlight={state.highlight}
                        forcedVisible={state.forcedVisible}
                        presentationMode={isFullscreen}
                        functionLabel={state.func}
                        showInlineMetrics={isFullscreen}
                        onDragPoint={handleCanvasPointDrag}
                    />
                ) : (
                    <DerivativeCanvas3D
                        engine={engine3D}
                        a={state.a}
                        b={state.b}
                        xDomain={state.xDomain3D}
                        yDomain={state.yDomain3D}
                        patchSize={state.patchSize3D}
                        showSurface={state.showSurface3D}
                        showPlane={state.showPlane3D}
                        showNormal={state.showNormal3D}
                        highlight={state.highlight}
                        cameraPreset={state.cameraPreset3D}
                    />
                )}

                {(!isFullscreen || showOverlayControls) && (
                    <ControlPanel
                        state={state}
                        data2D={data2D}
                        data3D={data3D}
                        onStateChange={setState}
                        onAnimate={() =>
                            startAnimation({
                                from: state.h,
                                to: 0.01,
                                duration: 2500
                            })
                        }
                        onReset={resetStudio}
                    />
                )}

                {isFullscreen && showOverlayChat && (
                    <div className="derivative-overlay-chat">
                        <DerivativeChat
                            title="Derivative Chat"
                            compact
                            messages={state.messages}
                            onSendMessage={handleSendMessage}
                            onQuickAction={handleQuickAction}
                            isAnimating={state.isAnimating}
                            onClose={() => setShowOverlayChat(false)}
                        />
                    </div>
                )}
            </div>

            {!isFullscreen && (
                <DerivativeChat
                    title="Derivative Chat"
                    compact
                    messages={state.messages}
                    onSendMessage={handleSendMessage}
                    onQuickAction={handleQuickAction}
                    isAnimating={state.isAnimating}
                />
            )}
        </div>
    );
}



