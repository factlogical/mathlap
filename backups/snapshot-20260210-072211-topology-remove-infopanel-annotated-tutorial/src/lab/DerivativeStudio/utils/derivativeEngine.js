import { create, all } from "mathjs";

const math = create(all);

export function buildEngine(funcString) {
    try {
        const node = math.parse(funcString);
        const compiledFunction = node.compile();

        let compiledDerivative = null;
        try {
            compiledDerivative = math.derivative(node, "x").compile();
        } catch {
            // Falls back to numeric differentiation if symbolic derivative is unavailable.
        }

        return {
            evalF: (x) => {
                try {
                    const value = compiledFunction.evaluate({ x });
                    return Number.isFinite(value) ? value : NaN;
                } catch {
                    return NaN;
                }
            },
            evalDerivative: (x) => {
                if (compiledDerivative) {
                    try {
                        const value = compiledDerivative.evaluate({ x });
                        if (Number.isFinite(value)) return value;
                    } catch {
                        // Continue to numeric fallback.
                    }
                }

                const eps = 1e-5;
                const fp = compiledFunction.evaluate({ x: x + eps });
                const fm = compiledFunction.evaluate({ x: x - eps });
                const numeric = (fp - fm) / (2 * eps);

                const eps2 = 2e-5;
                const fp2 = compiledFunction.evaluate({ x: x + eps2 });
                const fm2 = compiledFunction.evaluate({ x: x - eps2 });
                const numeric2 = (fp2 - fm2) / (2 * eps2);

                if (!Number.isFinite(numeric) || !Number.isFinite(numeric2)) {
                    return null;
                }

                if (Math.abs(numeric - numeric2) > 1) {
                    return null;
                }

                return numeric;
            }
        };
    } catch (error) {
        return { error: error.message };
    }
}

export function calculateData(engine, a, h) {
    if (!engine || engine.error) return null;

    const safeH = Math.abs(h) < 1e-6 ? (h >= 0 ? 1e-6 : -1e-6) : h;

    const fa = engine.evalF(a);
    const fah = engine.evalF(a + safeH);

    if (!Number.isFinite(fa) || !Number.isFinite(fah)) {
        return { error: "قيم غير معرفة عند النقاط المختارة." };
    }

    const slopeSecant = (fah - fa) / safeH;
    const slopeTangent = engine.evalDerivative(a);

    return {
        fa,
        fah,
        slope_secant: slopeSecant,
        slope_tangent: slopeTangent,
        isDerivableAtA: slopeTangent !== null,
        pointA: { x: a, y: fa },
        pointB: { x: a + safeH, y: fah }
    };
}
