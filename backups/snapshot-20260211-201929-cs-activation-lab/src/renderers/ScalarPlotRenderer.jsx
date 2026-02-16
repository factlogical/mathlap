import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import SafePlot from "../components/SafePlot";
import { create, all } from 'mathjs';
import { ZoomIn, ZoomOut, Home, Move, Crosshair, Grid } from "lucide-react";

const math = create(all);
const LIMITED_SCOPE = {
    sin: math.sin, cos: math.cos, tan: math.tan,
    asin: math.asin, acos: math.acos, atan: math.atan,
    sqrt: math.sqrt, abs: math.abs,
    log: math.log, log10: math.log10, exp: math.exp,
    pow: math.pow,
    pi: math.pi, e: math.e,
    sign: math.sign, round: math.round, floor: math.floor, ceil: math.ceil
};

/**
 * ScalarPlotRenderer - Desmos-Style Experience
 * Features: Infinite Canvas, Custom HUD, Neon Visuals
 */
const getSmartXRange = (expression = "") => {
    const expr = String(expression).toLowerCase();
    if (expr.includes("sin") || expr.includes("cos") || expr.includes("tan")) {
        return [-2 * Math.PI, 2 * Math.PI];
    }
    if (expr.includes("pi")) {
        return [-Math.PI, Math.PI];
    }
    if (expr.includes("sqrt")) {
        return [0, 25];
    }
    if (expr.includes("log")) {
        return [0.1, 10];
    }
    if (expr.includes("exp") || expr.includes("e^")) {
        return [-5, 5];
    }
    return [-10, 10];
};

const ScalarPlotRenderer = ({ spec, payload: directPayload, action }) => {
    const data = spec?.payload || spec?.params || directPayload || spec || {};
    const fallbackXRange = useMemo(
        () => data.domain?.x || getSmartXRange(data.math?.expression),
        [data.domain?.x?.[0], data.domain?.x?.[1], data.math?.expression]
    );

    const [plotData, setPlotData] = useState(null);
    const [error, setError] = useState(null);
    const [xRange, setXRange] = useState(() => fallbackXRange);
    const [yRange, setYRange] = useState(data.domain?.y || [-10, 10]);
    const [dragMode, setDragMode] = useState("pan");
    const [derivedExpression, setDerivedExpression] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [computeEpoch, setComputeEpoch] = useState(0);

    const relayoutTimerRef = useRef(null);
    const pendingRangeRef = useRef({ xRange: null, yRange: null, autoX: false, autoY: false });
    const isInteractingRef = useRef(false);
    const pendingComputeRef = useRef(false);
    const mathSpecRef = useRef(null);
    const autoYRef = useRef(!data.domain?.y);

    // Store math spec for recalculation on pan/zoom
    useEffect(() => {
        if (data?.math) {
            mathSpecRef.current = {
                math: data.math,
                transform: data.transform,
                view: data.view,
                domain: data.domain
            };
        }
    }, [data]);

    useEffect(() => {
        return () => {
            if (relayoutTimerRef.current) clearTimeout(relayoutTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const isLineView = !data.view?.type || data.view?.type === 'line' || data.view?.type === 'line3d';
        autoYRef.current = isLineView;
    }, [data.math?.expression, data.math?.kind, data.view?.type]);

    useEffect(() => {
        setXRange(fallbackXRange);
    }, [fallbackXRange]);

    // Compute plot data
    useEffect(() => {
        if (!data || !data.math) return;
        if (isInteractingRef.current) {
            pendingComputeRef.current = true;
            return;
        }
        let cancelled = false;

        const run = async () => {
            try {
                setError(null);
                if (plotData) setIsUpdating(true);
                const { math: mathSpec, transform, view, domain } = data;
                const kind = mathSpec.kind;
                let derivativeExpr = null;

                if (kind === 'scalar_field' || kind === 'function_1d') {
                    if (transform?.op === 'partial_derivative' && transform.variable) {
                        try {
                            derivativeExpr = math.derivative(mathSpec.expression, transform.variable).toString();
                        } catch (e) {
                            derivativeExpr = null;
                        }
                    }
                    if (!cancelled) setDerivedExpression(derivativeExpr);
                    const result = await computeScalarField(
                        mathSpec,
                        transform,
                        view,
                        { ...domain, x: xRange, y: yRange },
                        derivativeExpr,
                        autoYRef.current,
                        () => isInteractingRef.current
                    );
                    if (result?.aborted) return;
                    if (!cancelled) {
                        setPlotData(result.traces);
                        if (result.yBounds && autoYRef.current) {
                            const [minY, maxY] = result.yBounds;
                            const pad = Math.max(1, (maxY - minY) * 0.1);
                            const nextRange = [minY - pad, maxY + pad];
                            if (
                                Math.abs(nextRange[0] - yRange[0]) > 1e-6 ||
                                Math.abs(nextRange[1] - yRange[1]) > 1e-6
                            ) {
                                setYRange(nextRange);
                            }
                        }
                    }
                } else if (kind === 'sequence' || (data.mode === 'recurrence')) {
                    const result = computeRecurrence(data);
                    if (!cancelled) setPlotData(result);
                } else if (kind === 'data_set' || (data.mode === 'data')) {
                    if (!cancelled) {
                        setPlotData([
                            {
                                x: mathSpec.data?.x || data.data?.x || [],
                                y: mathSpec.data?.y || data.data?.y || [],
                                type: view?.type || data.plot_type || 'scatter',
                                mode: 'lines',
                                line: { color: '#00ffff', width: 4, shape: 'linear', simplify: false },
                                connectgaps: false
                            }
                        ]);
                    }
                } else {
                    if (kind?.includes('vector')) {
                        if (!cancelled) setError("Scalar Renderer cannot handle vectors.");
                        return;
                    }
                    throw new Error(`Unknown math kind: ${kind}`);
                }
            } catch (err) {
                console.error("ScalarPlotRenderer Error:", err);
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setIsUpdating(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [spec, directPayload, xRange, yRange, computeEpoch]);

    const captureRanges = useCallback((event) => {
        const toNumber = (val) => {
            if (val === null || val === undefined) return null;
            const num = Number(val);
            return Number.isFinite(num) ? num : null;
        };

        if (event?.['xaxis.autorange']) {
            pendingRangeRef.current.autoX = true;
            pendingRangeRef.current.xRange = null;
        } else {
            const newXRange = event?.['xaxis.range[0]'] !== undefined
                ? [event['xaxis.range[0]'], event['xaxis.range[1]']]
                : event?.['xaxis.range'] || null;
            if (newXRange && newXRange[0] !== undefined) {
                const next = [toNumber(newXRange[0]), toNumber(newXRange[1])];
                if (next[0] !== null && next[1] !== null) {
                    pendingRangeRef.current.autoX = false;
                    pendingRangeRef.current.xRange = next;
                }
            }
        }

        if (event?.['yaxis.autorange']) {
            pendingRangeRef.current.autoY = true;
            pendingRangeRef.current.yRange = null;
        } else {
            const newYRange = event?.['yaxis.range[0]'] !== undefined
                ? [event['yaxis.range[0]'], event['yaxis.range[1]']]
                : event?.['yaxis.range'] || null;
            if (newYRange && newYRange[0] !== undefined) {
                const next = [toNumber(newYRange[0]), toNumber(newYRange[1])];
                if (next[0] !== null && next[1] !== null) {
                    pendingRangeRef.current.autoY = false;
                    pendingRangeRef.current.yRange = next;
                }
            }
        }
    }, []);

    const beginInteraction = useCallback(() => {
        if (!isInteractingRef.current) {
            pendingRangeRef.current = { xRange: null, yRange: null, autoX: false, autoY: false };
        }
        isInteractingRef.current = true;
        pendingComputeRef.current = true;
        autoYRef.current = false;
    }, []);

    const scheduleRelayoutApply = useCallback(() => {
        if (relayoutTimerRef.current) clearTimeout(relayoutTimerRef.current);
        relayoutTimerRef.current = setTimeout(() => {
            const pending = pendingRangeRef.current;
            let changed = false;

            if (pending.autoX) {
                setXRange(fallbackXRange);
                changed = true;
            } else if (pending.xRange) {
                setXRange(pending.xRange);
                changed = true;
            }

            if (pending.autoY) {
                autoYRef.current = false;
            } else if (pending.yRange) {
                autoYRef.current = false;
                setYRange(pending.yRange);
                changed = true;
            }

            pendingRangeRef.current = { xRange: null, yRange: null, autoX: false, autoY: false };
            isInteractingRef.current = false;

            if (!changed && pendingComputeRef.current) {
                setComputeEpoch((prev) => prev + 1);
            }
            pendingComputeRef.current = false;
        }, 250);
    }, [fallbackXRange]);

    const handleRelayouting = useCallback((event) => {
        beginInteraction();
        captureRanges(event);
        scheduleRelayoutApply();
    }, [beginInteraction, captureRanges, scheduleRelayoutApply]);

    // Apply ranges only after interaction ends (trailing debounce)
    const handleRelayout = useCallback((event) => {
        beginInteraction();
        captureRanges(event);
        scheduleRelayoutApply();
    }, [beginInteraction, captureRanges, scheduleRelayoutApply]);

    // Control Handlers
    const handleZoomIn = () => {
        const cx = (xRange[0] + xRange[1]) / 2;
        const cy = (yRange[0] + yRange[1]) / 2;
        const wx = (xRange[1] - xRange[0]) * 0.4;
        const wy = (yRange[1] - yRange[0]) * 0.4;
        setXRange([cx - wx, cx + wx]);
        setYRange([cy - wy, cy + wy]);
        autoYRef.current = false;
    };

    const handleZoomOut = () => {
        const cx = (xRange[0] + xRange[1]) / 2;
        const cy = (yRange[0] + yRange[1]) / 2;
        const wx = (xRange[1] - xRange[0]) * 1.25;
        const wy = (yRange[1] - yRange[0]) * 1.25;
        setXRange([cx - wx, cx + wx]);
        setYRange([cy - wy, cy + wy]);
        autoYRef.current = false;
    };

    const handleReset = useCallback(() => {
        setXRange(fallbackXRange);
        setYRange([-10, 10]);
        autoYRef.current = !data.view?.type || data.view?.type === 'line' || data.view?.type === 'line3d';
    }, [fallbackXRange, data.view?.type]);

    const toggleDragMode = () => {
        setDragMode(dragMode === 'pan' ? 'zoom' : 'pan');
    };

    useEffect(() => {
        if (!action?.type) return;
        if (action.type === "RESET_VIEW") {
            handleReset();
        }
        if (action.type === "TOGGLE_GRID") {
            setShowGrid((prev) => !prev);
        }
    }, [action, handleReset]);

    // Error UI
    if (error) {
        return (
            <div className="function-2d-container">
                <div className="function-2d-error">{error}</div>
            </div>
        );
    }

    if (!plotData) {
        return (
            <div className="function-2d-container">
                <div className="flex items-center justify-center h-full text-white/50">
                    Calculating...
                </div>
            </div>
        );
    }

    // Neon Layout
    const is3D = data.view?.dimension === '3D' || data.view?.type === 'line3d';
    const tightLayout = Boolean(data.ui?.tight);
    const gridColor = showGrid ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0)";
    const axisColor = showGrid ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.2)";
    const layout = {
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        uirevision: "keep",
        font: {
            color: '#64748b',
            family: "'JetBrains Mono', 'Consolas', monospace",
            size: 11
        },
        margin: tightLayout ? { l: 20, r: 12, t: 16, b: 20 } : { l: 50, r: 30, t: 30, b: 50 },
        xaxis: {
            range: xRange,
            autorange: false,
            gridcolor: gridColor,
            zerolinecolor: axisColor,
            zerolinewidth: 2,
            tickfont: { family: "'JetBrains Mono', monospace" },
            showspikes: false
        },
        yaxis: {
            range: yRange,
            autorange: false,
            gridcolor: gridColor,
            zerolinecolor: axisColor,
            zerolinewidth: 2,
            tickfont: { family: "'JetBrains Mono', monospace" },
            showspikes: false
        },
        showlegend: false,
        dragmode: is3D ? 'orbit' : dragMode,
        hovermode: 'x unified',
        ...(is3D || data.plot_type === 'surface' ? {
            scene: {
                xaxis: { gridcolor: '#1e293b' },
                yaxis: { gridcolor: '#1e293b' },
                zaxis: { gridcolor: '#1e293b' },
            }
        } : {})
    };

    return (
        <div className="function-2d-container">
            {/* Full Screen Graph */}
            <div className="function-2d-graph">
                <SafePlot
                    data={plotData}
                    layout={layout}
                    onRelayouting={handleRelayouting}
                    onRelayout={handleRelayout}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler={true}
                    config={{
                        displayModeBar: is3D,
                        scrollZoom: true,
                        doubleClick: 'reset',
                        responsive: true
                    }}
                />
            </div>
            {isUpdating && plotData && (
                <div className="absolute top-4 right-4 z-20 rounded-full border border-cyan-500/30 bg-slate-900/70 px-3 py-1 text-xs text-cyan-200">
                    Updating...
                </div>
            )}

            {/* Equation Label */}
            {data.math?.expression && (
                <div className="function-2d-equation">
                    <span style={{ color: '#00ffff' }}>f(x) = {data.math.expression}</span>
                    {data.transform?.op === 'partial_derivative' && derivedExpression && (
                        <div style={{ color: '#f97316', marginTop: 4 }}>f'(x) = {derivedExpression}</div>
                    )}
                </div>
            )}

            {/* Custom Navigation HUD */}
            {!is3D && (
                <div className="function-2d-hud">
                    <button onClick={handleZoomIn} className="function-hud-btn" title="Zoom In">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={handleZoomOut} className="function-hud-btn" title="Zoom Out">
                        <ZoomOut size={18} />
                    </button>
                    <div className="function-hud-divider" />
                    <button onClick={handleReset} className="function-hud-btn" title="Reset View">
                        <Home size={18} />
                    </button>
                    <button
                        onClick={() => setShowGrid((prev) => !prev)}
                        className={`function-hud-btn ${showGrid ? 'active' : ''}`}
                        title="Toggle Grid"
                    >
                        <Grid size={18} />
                    </button>
                    <button
                        onClick={toggleDragMode}
                        className={`function-hud-btn ${dragMode === 'zoom' ? 'active' : ''}`}
                        title={dragMode === 'pan' ? 'Switch to Zoom' : 'Switch to Pan'}
                    >
                        {dragMode === 'pan' ? <Move size={18} /> : <Crosshair size={18} />}
                    </button>
                </div>
            )}

            {/* Range Info */}
            <div className="function-2d-info">
                <span>Domain: [{xRange[0].toFixed(2)}, {xRange[1].toFixed(2)}]</span>
            </div>
        </div>
    );
};

// --- COMPUTE ENGINES ---

const waitFrame = () => new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(resolve);
    } else {
        setTimeout(resolve, 16);
    }
});

async function computeScalarField(
    mathSpec,
    transform,
    view,
    domain,
    derivativeExpressionOverride = null,
    allowAutoY = true,
    shouldAbort = null
) {
    let expression = mathSpec.expression;
    const baseExpression = expression;

    // Apply Transformation
    if (transform?.op === 'partial_derivative' && transform.variable) {
        try {
            const d = derivativeExpressionOverride
                ? derivativeExpressionOverride
                : math.derivative(expression, transform.variable).toString();
            expression = d;
        } catch (e) {
            throw new Error(`Failed to compute derivative: ${e.message}`);
        }
    }

    const node = math.parse(expression);
    const compiled = node.compile();
    const baseNode = transform?.op === 'partial_derivative' ? math.parse(baseExpression) : null;
    const compiledBase = baseNode ? baseNode.compile() : null;

    // Sample exactly within the current domain to avoid sliding/jitter
    const xDist = domain.x || getSmartXRange(expression);
    const yDist = domain.y || [-10, 10];
    // Dynamic resolution based on range size (boost minimum to prevent broken lines)
    const rangeSize = xDist[1] - xDist[0];
    const basePoints = 900;
    const dynamic = Math.ceil(rangeSize * 25);
    const N = Math.max(600, Math.min(2000, Math.max(basePoints, dynamic)));

    const isAbortRequested = () => (typeof shouldAbort === 'function' && shouldAbort());

    // 2D Line Plot
    if (view?.type === 'line' || !view?.type || view?.type === 'line3d') {
        const xArr = [];
        const yArr = [];
        const glowY = [];
        const baseY = [];
        const step = (xDist[1] - xDist[0]) / N;

        const chunkSize = 600;
        for (let i = 0; i <= N; i++) {
            if (isAbortRequested()) return { aborted: true };
            const x = xDist[0] + i * step;
            try {
                let y = compiled.evaluate({ ...LIMITED_SCOPE, x });
                if (!isFinite(y) || isNaN(y)) y = null;
                xArr.push(x);
                yArr.push(y);
                glowY.push(y);
            } catch {
                xArr.push(x);
                yArr.push(null);
                glowY.push(null);
            }

            if (compiledBase) {
                try {
                    let yBase = compiledBase.evaluate({ ...LIMITED_SCOPE, x });
                    if (!isFinite(yBase) || isNaN(yBase)) yBase = null;
                    baseY.push(yBase);
                } catch {
                    baseY.push(null);
                }
            }

            if (i % chunkSize === 0) {
                await waitFrame();
                if (isAbortRequested()) return { aborted: true };
            }
        }

        const validYs = yArr.filter((v) => Number.isFinite(v));
        const yBounds = validYs.length
            ? [Math.min(...validYs), Math.max(...validYs)]
            : null;

        // 3D Line
        if (view?.dimension === '3D' || view?.type === 'line3d') {
            return {
                traces: [{
                    x: xArr,
                    y: yArr,
                    z: xArr.map(() => 0),
                    type: 'scatter3d',
                    mode: 'lines',
                    line: { color: '#00ffff', width: 6, simplify: false },
                    connectgaps: false
                }],
                yBounds: allowAutoY ? yBounds : null
            };
        }

        if (compiledBase) {
            return {
                traces: [
                    {
                        x: xArr,
                        y: baseY,
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: 'rgba(148, 163, 184, 0.6)', width: 2, dash: 'dot', shape: 'linear', simplify: false },
                        hoverinfo: 'skip',
                        showlegend: false,
                        connectgaps: false
                    },
                    {
                        x: xArr,
                        y: glowY,
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: 'rgba(0, 255, 255, 0.2)', width: 10, shape: 'linear', simplify: false },
                        hoverinfo: 'skip',
                        showlegend: false,
                        connectgaps: false
                    },
                    {
                        x: xArr,
                        y: yArr,
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: '#00ffff', width: 3, shape: 'linear', simplify: false },
                        hovertemplate: '<b>x</b>: %{x:.3f}<br><b>f\'(x)</b>: %{y:.3f}<extra></extra>',
                        connectgaps: false
                    }
                ],
                yBounds: allowAutoY ? yBounds : null
            };
        }

        // 2D Neon Line
        return {
            traces: [
                {
                    x: xArr,
                    y: glowY,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'rgba(0, 255, 255, 0.2)', width: 10, shape: 'linear', simplify: false },
                    hoverinfo: 'skip',
                    showlegend: false,
                    connectgaps: false
                },
                {
                    x: xArr,
                    y: yArr,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#00ffff', width: 3, shape: 'linear', simplify: false },
                    hovertemplate: '<b>x</b>: %{x:.3f}<br><b>f(x)</b>: %{y:.3f}<extra></extra>',
                    connectgaps: false
                }
            ],
            yBounds: allowAutoY ? yBounds : null
        };
    }

    // Surface / Heatmap / Contour
    if (view?.type === 'surface' || view?.type === 'heatmap' || view?.type === 'contour') {
        const nx = (view?.dimension === '3D') ? N : 100;
        const ny = (view?.dimension === '3D') ? N : 100;

        const xArr = [];
        const yArr = [];
        const zArr = [];

        const stepX = (xDist[1] - xDist[0]) / nx;
        const stepY = (yDist[1] - yDist[0]) / ny;

        for (let i = 0; i < nx; i++) xArr.push(xDist[0] + i * stepX);
        for (let j = 0; j < ny; j++) yArr.push(yDist[0] + j * stepY);

        for (let j = 0; j < ny; j++) {
            if (isAbortRequested()) return { aborted: true };
            const row = [];
            let y = yArr[j];
            for (let i = 0; i < nx; i++) {
                let x = xArr[i];
                try {
                    let z = compiled.evaluate({ ...LIMITED_SCOPE, x, y });
                    if (!isFinite(z)) z = null;
                    row.push(z);
                } catch {
                    row.push(null);
                }
            }
            zArr.push(row);
            if (j % 20 === 0) {
                await waitFrame();
                if (isAbortRequested()) return { aborted: true };
            }
        }

        const common = { x: xArr, y: yArr, z: zArr };

        if (view?.type === 'surface') {
            return { traces: [{ ...common, type: 'surface', colorscale: 'Viridis' }] };
        }
        if (view?.type === 'heatmap') {
            return { traces: [{ ...common, type: 'heatmap', colorscale: 'Viridis' }] };
        }
        if (view?.type === 'contour') {
            return { traces: [{ ...common, type: 'contour', colorscale: 'Viridis' }] };
        }
    }

    throw new Error(`Unsupported view type: ${view?.type}`);
}

function computeRecurrence(spec) {
    const rule = spec.math?.expression || spec.rule;
    const initial = spec.math?.initial || spec.initial;
    const n_range = spec.domain?.n_range || spec.n_range;

    const MAX_ITERATIONS = 5000;
    const MAX_LOOKBACK = 10;

    const start = n_range[0];
    const end = n_range[1];

    if (end - start > MAX_ITERATIONS) {
        throw new Error(`Sequence too long. Max ${MAX_ITERATIONS} steps.`);
    }

    const nArr = [];
    const aArr = [];

    const processedRule = rule.replace(/a\(n(?:-(\d+))?\)/g, (match, offsetStr) => {
        const offset = offsetStr ? parseInt(offsetStr) : 0;
        if (offset > MAX_LOOKBACK) throw new Error(`Lookback too deep.`);
        return `getVal(${offset})`;
    });

    const node = math.parse(processedRule);
    const compiled = node.compile();

    const values = new Map();
    Object.keys(initial).forEach(k => values.set(parseInt(k), initial[k]));

    const createScope = (currentN) => ({
        ...LIMITED_SCOPE,
        n: currentN,
        getVal: (offset) => {
            const targetIndex = currentN - offset;
            if (!values.has(targetIndex)) return 0;
            return values.get(targetIndex);
        }
    });

    for (let n = start; n <= end; n++) {
        let val;
        if (values.has(n)) {
            val = values.get(n);
        } else {
            try {
                val = compiled.evaluate(createScope(n));
                if (!isFinite(val) || isNaN(val) || Math.abs(val) > 1e12) val = NaN;
                values.set(n, val);
            } catch {
                val = null;
            }
        }
        nArr.push(n);
        aArr.push(val);
    }

    return [{
        x: nArr,
        y: aArr,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#00ffff', width: 3, shape: 'linear', simplify: false },
        marker: { size: 6, color: '#00ffff' },
        connectgaps: false
    }];
}

export default ScalarPlotRenderer;
