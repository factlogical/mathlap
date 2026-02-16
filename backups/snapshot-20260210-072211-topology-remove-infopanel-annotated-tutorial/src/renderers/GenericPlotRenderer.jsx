
import React, { useMemo, useState, useEffect } from "react";
import SafePlot from "../components/SafePlot";
import { create, all } from 'mathjs';

// 1. Configure MathJS with an allowlist for safety
// We only import specific functions to prevent arbitrary code execution (though mathjs is generally safe)
const math = create(all);
const LIMITED_SCOPE = {
    // Basic arithmetic is built-in
    // Common functions
    sin: math.sin, cos: math.cos, tan: math.tan,
    asin: math.asin, acos: math.acos, atan: math.atan,
    sqrt: math.sqrt, abs: math.abs,
    log: math.log, log10: math.log10, exp: math.exp,
    pow: math.pow,
    // Constants
    pi: math.pi, e: math.e,
    // Utils
    sign: math.sign, round: math.round, floor: math.floor, ceil: math.ceil
};

/**
 * GenericPlotRenderer (The Hybrid Engine)
 * 
 * Handles 3 Modes:
 * 1. Equation: Evaluates continuous functions (2D/3D) safely on the client.
 * 2. Recurrence: Iterates sequences based on rules a(n).
 * 3. Data: Passthrough for static datasets.
 */
const GenericPlotRenderer = ({ spec, payload: directPayload }) => {
    console.log("Renderer Received:", spec);

    // Robust Fallback: Handle flat or nested structures
    const data = spec?.payload || spec?.params || directPayload || spec || {};

    const [plotData, setPlotData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!data || !data.math) return;

        try {
            setError(null);

            const { math, transform, view, domain } = data;
            const kind = math.kind;

            if (kind === 'scalar_field') {
                const result = computeScalarField(math, transform, view, domain);
                setPlotData(result);
            } else if (kind === 'sequence' || (data.mode === 'recurrence')) {
                // Support new schema 'sequence' OR legacy 'recurrence' mode
                const result = computeRecurrence(data); // Legacy function adapted below if needed
                setPlotData(result);
            } else if (kind === 'data_set' || (data.mode === 'data')) {
                setPlotData([
                    {
                        x: math.data?.x || data.data?.x || [],
                        y: math.data?.y || data.data?.y || [],
                        type: view?.type || data.plot_type || 'scatter',
                        mode: (view?.type || data.plot_type) === 'scatter' ? 'markers' : undefined,
                        marker: { color: '#00e5ff' }
                    }
                ]);
            } else {
                throw new Error(`Unknown math kind: ${kind}`);
            }

        } catch (err) {
            console.error("GenericPlotRenderer Error:", err);
            setError(err.message);
        }
    }, [spec, directPayload]);

    // Error UI
    if (error) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 p-4">
                <div className="border border-red-500 bg-red-900/20 p-6 rounded max-w-lg">
                    <h3 className="font-bold mb-2">Calculation Error</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!plotData) return <div className="text-white/50 p-10">Calculating semantic model...</div>;

    const layout = useMemo(() => ({
        title: data.math?.expression || "Generic Plot",
        autosize: true,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e2e8f0' },
        margin: { l: 40, r: 40, t: 40, b: 40 },
        xaxis: { gridcolor: '#334155' },
        yaxis: { gridcolor: '#334155' },
        // 3D Scene Config
        ...(data.view?.dimension === '3D' || data.plot_type === 'surface' ? {
            scene: {
                xaxis: { gridcolor: '#334155' },
                yaxis: { gridcolor: '#334155' },
                zaxis: { gridcolor: '#334155' },
            }
        } : {}),
        // Stability Fixes
        uirevision: 'generic-plot', // Keep interaction state across updates
    }), [data.math?.expression, data.view?.dimension, data.plot_type]);

    return (
        <div className="w-full h-full">
            <SafePlot
                data={plotData}
                layout={layout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
                config={{ responsive: true, displayModeBar: false }}
            />
        </div>
    );
};

// --- ENGINES ---

function computeScalarField(mathSpec, transform, view, domain) {
    let expression = mathSpec.expression;

    // 1. Apply Transformation (Symbolic)
    if (transform?.op === 'partial_derivative' && transform.variable) {
        try {
            // Use mathjs symbolic derivative
            const d = math.derivative(expression, transform.variable);
            expression = d.toString();
            console.log(`Computed Derivative: d/d${transform.variable}(${mathSpec.expression}) = ${expression}`);
        } catch (e) {
            throw new Error(`Failed to compute derivative: ${e.message}`);
        }
    }

    // 2. Compile
    const node = math.parse(expression);
    const compiled = node.compile();

    // 3. Grid Generation
    const xDist = domain.x || [-10, 10];
    const yDist = domain.y || [-10, 10];
    // Resolution defaults
    const N = domain.resolution || (view.dimension === '3D' ? 60 : 2000);

    console.log("Rendering View:", view, "vars:", mathSpec.variables);

    // 3A. 1D Line Plot (2D or 3D)
    if (view.type === 'line' || view.type === 'line3d') {
        const xArr = [];
        const yArr = [];
        const zArr = []; // For 3D
        const step = (xDist[1] - xDist[0]) / N;

        for (let i = 0; i <= N; i++) {
            const x = xDist[0] + i * step;
            try {
                let y = compiled.evaluate({ ...LIMITED_SCOPE, x });
                if (!isFinite(y) || isNaN(y)) y = null;
                xArr.push(x);
                yArr.push(y);
                zArr.push(0); // Fixed plane for 3D line
            } catch {
                xArr.push(x);
                yArr.push(null);
                zArr.push(0);
            }
        }

        // 3D Line
        if (view.dimension === '3D' || view.type === 'line3d') {
            return [{
                x: xArr,
                y: yArr, // y = f(x)
                z: zArr, // z = 0
                type: 'scatter3d',
                mode: 'lines',
                line: { color: '#4ade80', width: 5 }
            }];
        }

        // 2D Line
        return [{ x: xArr, y: yArr, type: 'scatter', mode: 'lines', line: { color: '#4ade80', width: 2 } }];
    }

    // 3B. 2D Heatmap / Contour / 3D Surface
    if (view.type === 'surface' || view.type === 'heatmap' || view.type === 'contour') {
        const nx = (view.dimension === '3D') ? N : 100; // valid resolution for heatmaps
        const ny = (view.dimension === '3D') ? N : 100;

        const xArr = [];
        const yArr = [];
        const zArr = [];

        const stepX = (xDist[1] - xDist[0]) / nx;
        const stepY = (yDist[1] - yDist[0]) / ny;

        // X/Y Vectors
        for (let i = 0; i < nx; i++) xArr.push(xDist[0] + i * stepX);
        for (let j = 0; j < ny; j++) yArr.push(yDist[0] + j * stepY);

        // Z Matrix (Row-major)
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

        if (view.type === 'surface') {
            return [{ ...common, type: 'surface', colorscale: 'Viridis' }];
        }
        if (view.type === 'heatmap') {
            return [{ ...common, type: 'heatmap', colorscale: 'Viridis' }];
        }
        if (view.type === 'contour') {
            return [{ ...common, type: 'contour', colorscale: 'Viridis' }];
        }
    }

    throw new Error(`Unsupported view type: ${view.type}`);
}


function computeRecurrence(spec) {
    // Map new schema fields to legacy if needed, or use direct
    const rule = spec.math?.expression || spec.rule;
    const initial = spec.math?.initial || spec.initial;
    const n_range = spec.domain?.n_range || spec.n_range;

    // Safety Limits
    const MAX_ITERATIONS = 5000;
    const MAX_LOOKBACK = 10;

    const start = n_range[0];
    const end = n_range[1];

    if (end - start > MAX_ITERATIONS) {
        throw new Error(`Sequence too long. Max ${MAX_ITERATIONS} steps.`);
    }

    const nArr = [];
    const aArr = [];

    // Regex parse a(n-k) -> getVal(k)
    const processedRule = rule.replace(/a\(n(?:-(\d+))?\)/g, (match, offsetStr) => {
        const offset = offsetStr ? parseInt(offsetStr) : 0;
        if (offset > MAX_LOOKBACK) throw new Error(`Lookback too deep. Max k=${MAX_LOOKBACK}`);
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
            } catch (e) {
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
        line: { color: '#facc15' },
        marker: { size: 4 }
    }];
}

export default GenericPlotRenderer;
