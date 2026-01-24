import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import SafePlot from "../components/SafePlot";
import { create, all } from 'mathjs';
import { ZoomIn, ZoomOut, Home, Move, Crosshair } from "lucide-react";

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
const ScalarPlotRenderer = ({ spec, payload: directPayload }) => {
    const data = spec?.payload || spec?.params || directPayload || spec || {};

    const [plotData, setPlotData] = useState(null);
    const [error, setError] = useState(null);
    const [xRange, setXRange] = useState(data.domain?.x || [-10, 10]);
    const [yRange, setYRange] = useState(data.domain?.y || [-10, 10]);
    const [dragMode, setDragMode] = useState("pan");
    const [derivedExpression, setDerivedExpression] = useState(null);

    const debounceRef = useRef(null);
    const mathSpecRef = useRef(null);

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

    // Compute plot data
    useEffect(() => {
        if (!data || !data.math) return;

        try {
            setError(null);
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
                setDerivedExpression(derivativeExpr);
                const result = computeScalarField(
                    mathSpec,
                    transform,
                    view,
                    { ...domain, x: xRange, y: yRange },
                    derivativeExpr
                );
                setPlotData(result);
            } else if (kind === 'sequence' || (data.mode === 'recurrence')) {
                const result = computeRecurrence(data);
                setPlotData(result);
            } else if (kind === 'data_set' || (data.mode === 'data')) {
                setPlotData([
                    {
                        x: mathSpec.data?.x || data.data?.x || [],
                        y: mathSpec.data?.y || data.data?.y || [],
                        type: view?.type || data.plot_type || 'scatter',
                        mode: 'lines',
                        line: { color: '#00ffff', width: 4 }
                    }
                ]);
            } else {
                if (kind?.includes('vector')) {
                    setError("Scalar Renderer cannot handle vectors.");
                    return;
                }
                throw new Error(`Unknown math kind: ${kind}`);
            }
        } catch (err) {
            console.error("ScalarPlotRenderer Error:", err);
            setError(err.message);
        }
    }, [spec, directPayload, xRange, yRange]);

    // Infinite Canvas: Handle Relayout
    const handleRelayout = useCallback((event) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            const newXRange = event['xaxis.range[0]'] !== undefined
                ? [event['xaxis.range[0]'], event['xaxis.range[1]']]
                : event['xaxis.range'] || null;

            const newYRange = event['yaxis.range[0]'] !== undefined
                ? [event['yaxis.range[0]'], event['yaxis.range[1]']]
                : event['yaxis.range'] || null;

            if (newXRange && newXRange[0] !== undefined) {
                setXRange([newXRange[0], newXRange[1]]);
            }
            if (newYRange && newYRange[0] !== undefined) {
                setYRange([newYRange[0], newYRange[1]]);
            }
        }, 100);
    }, []);

    // Control Handlers
    const handleZoomIn = () => {
        const cx = (xRange[0] + xRange[1]) / 2;
        const cy = (yRange[0] + yRange[1]) / 2;
        const wx = (xRange[1] - xRange[0]) * 0.4;
        const wy = (yRange[1] - yRange[0]) * 0.4;
        setXRange([cx - wx, cx + wx]);
        setYRange([cy - wy, cy + wy]);
    };

    const handleZoomOut = () => {
        const cx = (xRange[0] + xRange[1]) / 2;
        const cy = (yRange[0] + yRange[1]) / 2;
        const wx = (xRange[1] - xRange[0]) * 1.25;
        const wy = (yRange[1] - yRange[0]) * 1.25;
        setXRange([cx - wx, cx + wx]);
        setYRange([cy - wy, cy + wy]);
    };

    const handleReset = () => {
        setXRange([-10, 10]);
        setYRange([-10, 10]);
    };

    const toggleDragMode = () => {
        setDragMode(dragMode === 'pan' ? 'zoom' : 'pan');
    };

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
    const layout = {
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            color: '#64748b',
            family: "'JetBrains Mono', 'Consolas', monospace",
            size: 11
        },
        margin: tightLayout ? { l: 20, r: 12, t: 16, b: 20 } : { l: 50, r: 30, t: 30, b: 50 },
        xaxis: {
            range: xRange,
            gridcolor: "rgba(255, 255, 255, 0.05)",
            zerolinecolor: "rgba(255, 255, 255, 0.4)",
            zerolinewidth: 2,
            tickfont: { family: "'JetBrains Mono', monospace" },
            showspikes: true,
            spikecolor: "#00ffff",
            spikethickness: 1
        },
        yaxis: {
            range: yRange,
            gridcolor: "rgba(255, 255, 255, 0.05)",
            zerolinecolor: "rgba(255, 255, 255, 0.4)",
            zerolinewidth: 2,
            tickfont: { family: "'JetBrains Mono', monospace" },
            showspikes: true,
            spikecolor: "#00ffff",
            spikethickness: 1
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
                    onClick={toggleDragMode}
                    className={`function-hud-btn ${dragMode === 'zoom' ? 'active' : ''}`}
                    title={dragMode === 'pan' ? 'Switch to Zoom' : 'Switch to Pan'}
                >
                    {dragMode === 'pan' ? <Move size={18} /> : <Crosshair size={18} />}
                </button>
            </div>

            {/* Range Info */}
            <div className="function-2d-info">
                <span>X: [{xRange[0].toFixed(1)}, {xRange[1].toFixed(1)}]</span>
                <span>Y: [{yRange[0].toFixed(1)}, {yRange[1].toFixed(1)}]</span>
            </div>
        </div>
    );
};

// --- COMPUTE ENGINES ---

function computeScalarField(mathSpec, transform, view, domain, derivativeExpressionOverride = null) {
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

    // Add buffer for smoother infinite panning
    const rawXDist = domain.x || [-10, 10];
    const buffer = (rawXDist[1] - rawXDist[0]) * 0.3;
    const xDist = [rawXDist[0] - buffer, rawXDist[1] + buffer];
    const yDist = domain.y || [-10, 10];
    // Dynamic resolution based on range size
    const rangeSize = xDist[1] - xDist[0];
    const N = Math.max(500, Math.min(3000, Math.ceil(rangeSize * 40)));

    // 2D Line Plot
    if (view?.type === 'line' || !view?.type || view?.type === 'line3d') {
        const xArr = [];
        const yArr = [];
        const glowY = [];
        const baseY = [];
        const step = (xDist[1] - xDist[0]) / N;

        for (let i = 0; i <= N; i++) {
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
        }

        // 3D Line
        if (view?.dimension === '3D' || view?.type === 'line3d') {
            return [{
                x: xArr,
                y: yArr,
                z: xArr.map(() => 0),
                type: 'scatter3d',
                mode: 'lines',
                line: { color: '#00ffff', width: 6 }
            }];
        }

        if (compiledBase) {
            return [
                {
                    x: xArr,
                    y: baseY,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'rgba(148, 163, 184, 0.6)', width: 2, dash: 'dot' },
                    hoverinfo: 'skip',
                    showlegend: false
                },
                {
                    x: xArr,
                    y: glowY,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'rgba(0, 255, 255, 0.2)', width: 10 },
                    hoverinfo: 'skip',
                    showlegend: false
                },
                {
                    x: xArr,
                    y: yArr,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#00ffff', width: 3 },
                    hovertemplate: '<b>x</b>: %{x:.3f}<br><b>f\'(x)</b>: %{y:.3f}<extra></extra>'
                }
            ];
        }

        // 2D Neon Line (no spline for better infinite canvas performance)
        return [
            // Glow layer
            {
                x: xArr,
                y: glowY,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'rgba(0, 255, 255, 0.2)', width: 10 },
                hoverinfo: 'skip',
                showlegend: false
            },
            // Main line
            {
                x: xArr,
                y: yArr,
                type: 'scatter',
                mode: 'lines',
                line: { color: '#00ffff', width: 3 },
                hovertemplate: '<b>x</b>: %{x:.3f}<br><b>f(x)</b>: %{y:.3f}<extra></extra>'
            }
        ];
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
        }

        const common = { x: xArr, y: yArr, z: zArr };

        if (view?.type === 'surface') {
            return [{ ...common, type: 'surface', colorscale: 'Viridis' }];
        }
        if (view?.type === 'heatmap') {
            return [{ ...common, type: 'heatmap', colorscale: 'Viridis' }];
        }
        if (view?.type === 'contour') {
            return [{ ...common, type: 'contour', colorscale: 'Viridis' }];
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
        line: { color: '#00ffff', width: 3 },
        marker: { size: 6, color: '#00ffff' }
    }];
}

export default ScalarPlotRenderer;
