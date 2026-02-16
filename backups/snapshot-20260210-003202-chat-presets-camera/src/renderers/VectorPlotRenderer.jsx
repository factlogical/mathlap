import React, { memo, useState, useEffect, useMemo } from "react";
import SafePlot from "../components/SafePlot";

const VectorPlotRenderer = ({ spec, payload: directPayload, onAnalysis }) => {
    // Robust payload extraction
    const data = spec?.payload || spec?.params || directPayload || spec || {};


    // --- STATE ---
    // UI Controls
    const [showHeadToTail, setShowHeadToTail] = useState(false);
    const [showResultant, setShowResultant] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [scale, setScale] = useState(1.0);
    const [is3D, setIs3D] = useState(data.view?.dimension === '3D');
    const externalControls = data.ui?.vectorControls;
    const isControlled = Boolean(externalControls);
    const controls = isControlled
        ? {
            showHeadToTail: externalControls.showHeadToTail,
            showResultant: externalControls.showResultant,
            showLabels: externalControls.showLabels,
            scale: externalControls.scale,
            is3D: externalControls.is3D
        }
        : {
            showHeadToTail,
            showResultant,
            showLabels,
            scale,
            is3D
        };

    // Auto-detect initial settings from spec
    useEffect(() => {
        if (isControlled) return;
        if (data.view?.show_head_to_tail) setShowHeadToTail(true);
        if (data.view?.dimension === '3D') setIs3D(true);
        if (data.math?.kind === 'vector_operation') {
            setShowHeadToTail(true);
            setShowResultant(true);
        }
    }, [data.view, data.math?.kind, isControlled]);

    // --- DATA PROCESSING ---
    const plotResult = useMemo(() => {
        if (!data || !data.math) {
            return { traces: [], annotations: [], bounds: null, analysis: null };
        }

        try {
            const { math } = data;

            // 1. Normalize Vectors
            // Handle math.vectors (direct list) or math.data.vectors (from data_set misclassification)
            let rawVectors = math.vectors || math.data?.vectors;
            let vectorList = [];

            if (Array.isArray(rawVectors)) {
                vectorList = rawVectors.map(v => {
                    // Normalize {name, components} or {label, components} or direct array
                    if (Array.isArray(v)) return { components: v, label: 'v' };
                    return {
                        label: v.label || v.name || 'v',
                        components: v.components || v.vector || [0, 0],
                        color: v.color || null,
                        start: v.start || [0, 0, 0]
                    };
                });
            } else if (typeof rawVectors === 'object' && rawVectors !== null) {
                vectorList = Object.entries(rawVectors).map(([key, val]) => ({
                    label: key,
                    components: val,
                }));
            }

            // 2. Compute Head-to-Tail Positions
            // If Head-to-Tail is ON, we chain them. v1 starts at 0, v2 starts at v1_end ...
            let currentTip = [0, 0, 0];
            const processedVectors = [];

            vectorList.forEach((v) => {
                let start = [...(v.start || [0, 0, 0])];

                // If Head-to-Tail mode active, override start position (except for first vector usually? Or all chained?)
                // Usually Head-to-Tail means v + w + ... 
                // So v starts at 0. w starts at v_end.
                // However, user might supply explicit starts. We override if toggle is ON.
                if (controls.showHeadToTail) {
                    start = [...currentTip];
                }

                const comps = v.components || [0, 0];
                const dx = (comps[0] || 0) * controls.scale;
                const dy = (comps[1] || 0) * controls.scale;
                const dz = (comps[2] || 0) * controls.scale;

                const end = [start[0] + dx, start[1] + dy, start[2] + dz];

                // Try to infer specific roles
                // If it's the "resultant" in a vector_operation, typically handled separately or calculated?
                // For now, assume input list are operands.

                processedVectors.push({
                    ...v,
                    realStart: start,
                    realEnd: end,
                    magnitude: Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2),
                    componentsLabel: `(${dx.toFixed(1)}, ${dy.toFixed(1)}${controls.is3D ? `, ${dz.toFixed(1)}` : ''})`
                });

                // Update tip for next vector
                currentTip = end;
            });

            // 3. Optional Resultant (Head-to-Tail Sum)
            // Vector from Origin -> Final Tip
            if (controls.showResultant && processedVectors.length > 0) {
                const sum = vectorList.reduce((acc, v) => {
                    const comps = v.components || [0, 0, 0];
                    acc[0] += comps[0] || 0;
                    acc[1] += comps[1] || 0;
                    acc[2] += comps[2] || 0;
                    return acc;
                }, [0, 0, 0]);
                const scaledSum = [sum[0] * controls.scale, sum[1] * controls.scale, sum[2] * controls.scale];
                const resultantEnd = controls.showHeadToTail ? currentTip : scaledSum;

                processedVectors.push({
                    label: "Resultant",
                    realStart: [0, 0, 0],
                    realEnd: resultantEnd,
                    magnitude: Math.sqrt(resultantEnd[0] ** 2 + resultantEnd[1] ** 2 + resultantEnd[2] ** 2).toFixed(2),
                    componentsLabel: `(${resultantEnd[0].toFixed(1)}, ${resultantEnd[1].toFixed(1)}${controls.is3D ? `, ${resultantEnd[2].toFixed(1)}` : ''})`,
                    isResultant: true,
                    color: '#facc15' // Yellow
                });
            }

            // 4. Generate Traces & Annotations
            const traces = [];
            const annotations = [];
            const line3dX = [];
            const line3dY = [];
            const line3dZ = [];
            const tip3dX = [];
            const tip3dY = [];
            const tip3dZ = [];
            const tip3dColor = [];
            const tip3dHover = [];
            const tip3dLabel = [];

            processedVectors.forEach((v, idx) => {
                const s = v.realStart;
                const e = v.realEnd;

                const text = `${v.label}<br>|${v.label}|=${v.magnitude}<br>${v.componentsLabel}`;
                const color = v.color || (idx === 0 ? '#38bdf8' : '#ef4444'); // Blue then Red default

                if (controls.is3D) {
                    // Fast 3D path: use batched traces to avoid many WebGL draw calls.
                    line3dX.push(s[0], e[0], null);
                    line3dY.push(s[1], e[1], null);
                    line3dZ.push(s[2], e[2], null);

                    tip3dX.push(e[0]);
                    tip3dY.push(e[1]);
                    tip3dZ.push(e[2]);
                    tip3dColor.push(color);
                    tip3dHover.push(text);
                    tip3dLabel.push(v.label);
                } else {
                    // 2D: Annotation Arrow + Invisible Scatter for Hover
                    // Invisible Trace for Hover & Legend
                    traces.push({
                        type: 'scatter',
                        mode: 'markers',
                        x: [s[0], e[0], (s[0] + e[0]) / 2], // Start, End, Mid
                        y: [s[1], e[1], (s[1] + e[1]) / 2],
                        marker: { size: 6, opacity: 0 }, // Invisible click targets
                        name: v.label,
                        hoverinfo: 'text',
                        hovertext: text,
                        showlegend: true
                    });

                    // Arrow Annotation
                    annotations.push({
                        x: e[0], y: e[1], // Head
                        ax: s[0], ay: s[1], // Tail
                        xref: 'x', yref: 'y',
                        axref: 'x', ayref: 'y',
                        showarrow: true,
                        arrowhead: 2,
                        arrowsize: 1.2,
                        arrowwidth: 3,
                        arrowcolor: color,
                        text: controls.showLabels ? v.label : "",
                        font: { color: color, size: 14, weight: 'bold' },
                        startstandoff: 0
                    });
                }
            });

            if (controls.is3D && line3dX.length > 0) {
                traces.push({
                    type: 'scatter3d',
                    mode: 'lines',
                    x: line3dX,
                    y: line3dY,
                    z: line3dZ,
                    line: { width: 4, color: '#38bdf8' },
                    hoverinfo: 'skip',
                    showlegend: false
                });

                traces.push({
                    type: 'scatter3d',
                    mode: controls.showLabels ? 'markers+text' : 'markers',
                    x: tip3dX,
                    y: tip3dY,
                    z: tip3dZ,
                    marker: { size: 4, color: tip3dColor },
                    text: controls.showLabels ? tip3dLabel : undefined,
                    textposition: 'top center',
                    textfont: { size: 11, color: '#e2e8f0' },
                    customdata: tip3dHover,
                    hovertemplate: '%{customdata}<extra></extra>',
                    showlegend: false
                });
            }

            const toVec3 = (vec = []) => ([
                Number(vec?.[0] || 0),
                Number(vec?.[1] || 0),
                Number(vec?.[2] || 0)
            ]);
            const magnitude = (vec) => Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
            const formatVector = (vec) => `(${vec[0].toFixed(2)}, ${vec[1].toFixed(2)}, ${vec[2].toFixed(2)})`;

            let computedAnalysis = null;
            if (vectorList.length >= 1) {
                const a = toVec3(vectorList[0].components);
                const b = vectorList.length >= 2 ? toVec3(vectorList[1].components) : null;
                const magA = magnitude(a);
                const magB = b ? magnitude(b) : null;
                const dot = b ? (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) : null;
                const angle = b && magA && magB ? Math.acos(dot / (magA * magB)) : null;
                const resultant = vectorList.reduce((acc, v) => {
                    const vec = toVec3(v.components);
                    acc[0] += vec[0];
                    acc[1] += vec[1];
                    acc[2] += vec[2];
                    return acc;
                }, [0, 0, 0]);
                computedAnalysis = {
                    vectorA: formatVector(a),
                    vectorB: b ? formatVector(b) : "-",
                    magA: magA.toFixed(3),
                    magB: magB === null ? "-" : magB.toFixed(3),
                    dot: dot === null ? "-" : dot.toFixed(3),
                    angle: angle === null ? "-" : `${(angle * 180 / Math.PI).toFixed(2)}deg`,
                    resultant: formatVector(resultant),
                    resultantMag: magnitude(resultant).toFixed(3),
                    count: vectorList.length
                };
            }

            return {
                traces,
                annotations,
                analysis: computedAnalysis
            };

        } catch (err) {
            console.error("VectorCalc Error:", err);
            return { traces: [], annotations: [], analysis: null, error: err.message };
        }
    }, [
        data,
        controls.showHeadToTail,
        controls.showResultant,
        controls.showLabels,
        controls.scale,
        controls.is3D
    ]);

    const vectorDataKey = useMemo(() => {
        try {
            return JSON.stringify(data.math?.vectors || data.math?.data?.vectors || []);
        } catch {
            return "vector-data";
        }
    }, [data.math?.vectors, data.math?.data?.vectors]);

    const plotLayout = useMemo(() => {
        const glBackground = controls.is3D ? 'rgba(2, 6, 23, 0.92)' : 'rgba(0,0,0,0)';
        return {
            title: data.math?.expression || "Vector Visualization",
            autosize: true,
            paper_bgcolor: glBackground,
            plot_bgcolor: glBackground,
            font: { color: '#e2e8f0' },
            margin: { l: 20, r: 20, t: 40, b: 20 },
            showlegend: !controls.is3D,
            legend: { orientation: 'h', y: 0 },
            xaxis: {
                gridcolor: '#334155', zerolinecolor: '#94a3b8', zeroline: true
            },
            yaxis: {
                gridcolor: '#334155', zerolinecolor: '#94a3b8', zeroline: true,
                scaleanchor: "x"
            },
            scene: {
                bgcolor: glBackground,
                aspectmode: 'data',
                xaxis: { backgroundcolor: glBackground, gridcolor: '#334155' },
                yaxis: { backgroundcolor: glBackground, gridcolor: '#334155' },
                zaxis: { backgroundcolor: glBackground, gridcolor: '#334155' },
                camera: {
                    projection: { type: 'perspective' }
                }
            },
            dragmode: controls.is3D ? 'orbit' : 'pan',
            hovermode: controls.is3D ? false : 'closest',
            annotations: controls.is3D ? [] : plotResult.annotations,
            // CRITICAL FIX: uirevision MUST be stable - only change when DATA changes
            uirevision: vectorDataKey
        };
    }, [plotResult.annotations, data.math?.expression, vectorDataKey]);
    // ⚠️ Removed controls.is3D from dependencies - this was causing camera reset!

    const plotConfig = useMemo(() => ({
        responsive: true,
        displayModeBar: controls.is3D,
        scrollZoom: true,
        doubleClick: 'reset+autosize',
        displaylogo: false,
        plotGlPixelRatio: controls.is3D ? 1 : 2,
        editable: false,  // Prevent accidental annotation edits
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    }), [controls.is3D]);

    const plotData = plotResult.traces;
    const analysis = plotResult.analysis;

    useEffect(() => {
        onAnalysis?.(analysis || null);
    }, [analysis, onAnalysis]);

    return (
        <div className="w-full h-full relative">
            {/* UI Controls Overlay */}
            {!isControlled && (
                <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded text-xs flex flex-col gap-2 shadow-xl">
                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">Vector Tools</div>

                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showHeadToTail} onChange={e => setShowHeadToTail(e.target.checked)} />
                        Head-to-Tail
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showResultant} onChange={e => setShowResultant(e.target.checked)} />
                        Show Sum
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} />
                        Labels
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={is3D} onChange={e => setIs3D(e.target.checked)} />
                        3D Mode
                    </label>

                    <div className="flex flex-col gap-1 mt-1">
                        <span className="text-slate-400">Scale: {scale}x</span>
                        <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={e => setScale(Number(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
            )}

            <SafePlot
                data={plotData}
                layout={plotLayout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
                config={plotConfig}
            />
        </div>
    );
};

export default memo(VectorPlotRenderer);
