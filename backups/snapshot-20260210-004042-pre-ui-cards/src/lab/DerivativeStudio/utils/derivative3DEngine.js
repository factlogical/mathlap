import { create, all } from "mathjs";

const math = create(all);

const EPSILON = 1e-4;

function isFiniteNumber(value) {
    return Number.isFinite(value);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function buildEngine3D(funcString) {
    try {
        const node = math.parse(funcString);
        const compiledFunction = node.compile();

        let compiledDfx = null;
        let compiledDfy = null;

        try {
            compiledDfx = math.derivative(node, "x").compile();
        } catch {
            compiledDfx = null;
        }

        try {
            compiledDfy = math.derivative(node, "y").compile();
        } catch {
            compiledDfy = null;
        }

        const evalF = (x, y) => {
            try {
                const value = compiledFunction.evaluate({ x, y });
                return isFiniteNumber(value) ? value : NaN;
            } catch {
                return NaN;
            }
        };

        const evalGradient = (a, b) => {
            if (compiledDfx && compiledDfy) {
                try {
                    const dfx = compiledDfx.evaluate({ x: a, y: b });
                    const dfy = compiledDfy.evaluate({ x: a, y: b });
                    if (isFiniteNumber(dfx) && isFiniteNumber(dfy)) {
                        return { dfx, dfy, source: "symbolic" };
                    }
                } catch {
                    // Fall through to numeric gradient.
                }
            }

            const fppx = evalF(a + EPSILON, b);
            const fpmx = evalF(a - EPSILON, b);
            const fppy = evalF(a, b + EPSILON);
            const fpmy = evalF(a, b - EPSILON);
            if (!isFiniteNumber(fppx) || !isFiniteNumber(fpmx) || !isFiniteNumber(fppy) || !isFiniteNumber(fpmy)) {
                return null;
            }

            const dfx = (fppx - fpmx) / (2 * EPSILON);
            const dfy = (fppy - fpmy) / (2 * EPSILON);
            if (!isFiniteNumber(dfx) || !isFiniteNumber(dfy)) return null;

            return { dfx, dfy, source: "numeric" };
        };

        return {
            evalF,
            evalGradient
        };
    } catch (error) {
        return { error: error.message };
    }
}

export function calculateTangentPlane(engine, a, b, size) {
    if (!engine || engine.error) {
        return { error: "3D engine is unavailable." };
    }

    const z0 = engine.evalF(a, b);
    if (!isFiniteNumber(z0)) {
        return { error: "Function value is not finite at the selected point." };
    }

    const gradient = engine.evalGradient(a, b);
    if (!gradient || !isFiniteNumber(gradient.dfx) || !isFiniteNumber(gradient.dfy)) {
        return { error: "Could not evaluate the gradient at the selected point." };
    }

    const dfx = gradient.dfx;
    const dfy = gradient.dfy;
    const halfPatch = clamp(Math.abs(size || 1.5), 0.25, 8);

    const planeZ = (x, y) => z0 + dfx * (x - a) + dfy * (y - b);

    const corners = [
        { x: a - halfPatch, y: b - halfPatch },
        { x: a + halfPatch, y: b - halfPatch },
        { x: a + halfPatch, y: b + halfPatch },
        { x: a - halfPatch, y: b + halfPatch }
    ].map((point) => ({
        ...point,
        z: planeZ(point.x, point.y)
    }));

    const normalRaw = { x: -dfx, y: -dfy, z: 1 };
    const norm = Math.sqrt(normalRaw.x ** 2 + normalRaw.y ** 2 + normalRaw.z ** 2);
    const normalVector = norm > 0
        ? { x: normalRaw.x / norm, y: normalRaw.y / norm, z: normalRaw.z / norm }
        : { x: 0, y: 0, z: 1 };

    return {
        z0,
        dfx,
        dfy,
        point: { x: a, y: b, z: z0 },
        corners,
        normalVector,
        source: gradient.source || "numeric"
    };
}
