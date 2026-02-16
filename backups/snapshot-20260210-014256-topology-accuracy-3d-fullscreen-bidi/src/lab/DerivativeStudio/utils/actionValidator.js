const VALID_TYPES = [
    "set_mode",
    "change_function",
    "change_function_3d",
    "set_h",
    "move_point",
    "set_b",
    "animate",
    "toggle",
    "set_range"
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const FUNCTION_NAMES = [
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "sinh",
    "cosh",
    "tanh",
    "log",
    "ln",
    "sqrt",
    "abs",
    "exp"
];
const SINGLE_TOKEN_FN_RE = /^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|ln|sqrt|abs|exp)$/i;

function normalizeSignedH(value, fallback = 1) {
    const raw = Number.isFinite(Number(value)) ? Number(value) : fallback;
    const clamped = clamp(raw, -5, 5);
    if (Math.abs(clamped) < 0.01) {
        return clamped >= 0 ? 0.01 : -0.01;
    }
    return clamped;
}

function normalizeRange(rawRange, fallback, minBound = -100, maxBound = 100) {
    const start = Array.isArray(rawRange) ? Number(rawRange[0]) : Number(fallback[0]);
    const end = Array.isArray(rawRange) ? Number(rawRange[1]) : Number(fallback[1]);
    const safeStart = Number.isFinite(start) ? clamp(start, minBound, maxBound) : fallback[0];
    const safeEnd = Number.isFinite(end) ? clamp(end, minBound, maxBound) : fallback[1];

    if (safeStart >= safeEnd) {
        return fallback;
    }

    return [safeStart, safeEnd];
}

export function normalizeFunctionExpression(rawValue) {
    if (rawValue === null || rawValue === undefined) return "";
    let expr = String(rawValue)
        .normalize("NFKC")
        // Strip bidi/zero-width marks that often appear in RTL mixed math text.
        .replace(/[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
        .replace(/\u2061/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!expr) return "";

    expr = expr
        .replace(/π/g, "pi")
        .replace(/×/g, "*")
        .replace(/[−–]/g, "-")
        .replace(/جتا|جيب\s*تمام/gi, "cos")
        .replace(/جا/gi, "sin")
        .replace(/ظا/gi, "tan")
        .replace(/لوغاريتم|لوغ/gi, "log")
        .replace(/جذر/gi, "sqrt")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/⁴/g, "^4")
        .trim();

    expr = expr
        .replace(/^f\s*'?\s*\(\s*x\s*\)\s*=\s*/i, "")
        .replace(/^y\s*=\s*/i, "")
        .replace(/^z\s*=\s*/i, "")
        .replace(/^dy\/dx\s*=\s*/i, "")
        .trim();

    const fnGroup = FUNCTION_NAMES.join("|");
    const spacedCall = new RegExp(
        `\\b(${fnGroup})\\s+([a-zA-Z0-9_.]+(?:\\^[-+]?\\d+(?:\\.\\d+)?)?)\\b`,
        "gi"
    );
    expr = expr.replace(spacedCall, (_match, fn, arg) => `${fn}(${arg})`);

    const noSpaceCall = new RegExp(`\\b(${fnGroup})(x)\\b`, "gi");
    expr = expr.replace(noSpaceCall, (_match, fn, arg) => `${fn}(${arg})`);

    if (SINGLE_TOKEN_FN_RE.test(expr)) {
        expr = `${expr}(x)`;
    }

    return expr;
}

export function validateAction(action, currentState) {
    if (!action || !VALID_TYPES.includes(action.type)) return null;

    const params = action.params && typeof action.params === "object" ? action.params : {};

    switch (action.type) {
        case "set_mode": {
            const rawMode = String(params.mode || "").toUpperCase();
            if (rawMode !== "2D" && rawMode !== "3D") return null;
            return { type: "set_mode", params: { mode: rawMode } };
        }

        case "change_function": {
            const rawFunc = String(params.func || currentState.func).slice(0, 120);
            const normalized = normalizeFunctionExpression(rawFunc);
            const nextFunc = normalized || currentState.func;
            const nextA = params.a !== undefined
                ? clamp(Number(params.a), -100, 100)
                : currentState.a;

            return {
                type: "change_function",
                params: {
                    func: nextFunc,
                    a: Number.isFinite(nextA) ? nextA : currentState.a
                }
            };
        }

        case "change_function_3d": {
            const rawFunc3D = String(params.func3D || params.func || "").slice(0, 120);
            const normalized3D = normalizeFunctionExpression(rawFunc3D);
            if (!normalized3D) return null;

            const nextA = params.a !== undefined
                ? clamp(Number(params.a), -100, 100)
                : currentState.a;
            const nextB = params.b !== undefined
                ? clamp(Number(params.b), -100, 100)
                : currentState.b;

            return {
                type: "change_function_3d",
                params: {
                    func3D: normalized3D,
                    a: Number.isFinite(nextA) ? nextA : currentState.a,
                    b: Number.isFinite(nextB) ? nextB : currentState.b
                }
            };
        }

        case "set_h": {
            const nextH = normalizeSignedH(params.h, currentState.h);
            return { type: "set_h", params: { h: nextH } };
        }

        case "move_point": {
            const nextA = clamp(Number(params.a), -100, 100);
            return {
                type: "move_point",
                params: { a: Number.isFinite(nextA) ? nextA : currentState.a }
            };
        }

        case "set_b": {
            const nextB = clamp(Number(params.b), -100, 100);
            return {
                type: "set_b",
                params: { b: Number.isFinite(nextB) ? nextB : currentState.b }
            };
        }

        case "animate": {
            const from = normalizeSignedH(params.from, currentState.h);
            const targetSign = from >= 0 ? 1 : -1;
            const to = normalizeSignedH(
                params.to !== undefined ? params.to : 0.01 * targetSign,
                0.01 * targetSign
            );
            const duration = clamp(Number(params.duration) || 2000, 500, 10000);
            return { type: "animate", params: { from, to, duration } };
        }

        case "toggle": {
            const element = String(params.element || "").toLowerCase();
            if (!["secant", "tangent", "triangle", "surface", "plane", "normal"].includes(element)) return null;
            return {
                type: "toggle",
                params: {
                    element,
                    show: params.show !== false
                }
            };
        }

        case "set_range": {
            const xFallback = currentState.xRange2D || currentState.xRange || [-5, 5];
            const yFallback = currentState.yRange2D || currentState.yRange || [-2, 10];
            const xRange = normalizeRange(params.xRange, xFallback);
            const yRange = normalizeRange(params.yRange, yFallback);
            return {
                type: "set_range",
                params: { xRange, yRange }
            };
        }

        default:
            return null;
    }
}
