import React, { useState, useEffect, useMemo } from "react";
import SafePlot from "../components/SafePlot";

const VectorPlotRenderer = ({ spec, payload: directPayload }) => {
    // Robust payload extraction
    const data = spec?.payload || spec?.params || directPayload || spec || {};

    // Debug Log 
    console.log("[vector spec]", data.math?.kind, data.math);

    // --- STATE ---
    // UI Controls
    const [showHeadToTail, setShowHeadToTail] = useState(false);
    const [showResultant, setShowResultant] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [scale, setScale] = useState(1.0);
    const [is3D, setIs3D] = useState(data.view?.dimension === '3D');

    // Auto-detect initial settings from spec
    useEffect(() => {
        if (data.view?.show_head_to_tail) setShowHeadToTail(true);
        if (data.view?.dimension === '3D') setIs3D(true);
        if (data.math?.kind === 'vector_operation') {
            setShowHeadToTail(true);
            setShowResultant(true);
        }
    }, [data.view, data.math?.kind]);

    // --- DATA PROCESSING ---
    const { plotData, plotLayout } = useMemo(() => {
        if (!data || !data.math) return { plotData: [], plotLayout: {} };

        try {
            const { math, view } = data;

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

            vectorList.forEach((v, idx) => {
                let start = [...(v.start || [0, 0, 0])];

                // If Head-to-Tail mode active, override start position (except for first vector usually? Or all chained?)
                // Usually Head-to-Tail means v + w + ... 
                // So v starts at 0. w starts at v_end.
                // However, user might supply explicit starts. We override if toggle is ON.
                if (showHeadToTail) {
                    start = [...currentTip];
                }

                const comps = v.components || [0, 0];
                const dx = (comps[0] || 0) * scale;
                const dy = (comps[1] || 0) * scale;
                const dz = (comps[2] || 0) * scale;

                const end = [start[0] + dx, start[1] + dy, start[2] + dz];

                // Try to infer specific roles
                // If it's the "resultant" in a vector_operation, typically handled separately or calculated?
                // For now, assume input list are operands.

                processedVectors.push({
                    ...v,
                    realStart: start,
                    realEnd: end,
                    magnitude: Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2),
                    componentsLabel: `(${dx.toFixed(1)}, ${dy.toFixed(1)}${is3D ? `, ${dz.toFixed(1)}` : ''})`
                });

                // Update tip for next vector
                currentTip = end;
            });

            // 3. Optional Resultant (Head-to-Tail Sum)
            // Vector from Origin -> Final Tip
            if (showHeadToTail && showResultant && processedVectors.length > 0) {
                // Resultant R = Sum(v_i)
                // Start: [0,0,0], End: currentTip
                // Only if we haven't already included explicit resultant in the list
                processedVectors.push({
                    label: "Resultant",
                    realStart: [0, 0, 0],
                    realEnd: currentTip,
                    magnitude: Math.sqrt(currentTip[0] ** 2 + currentTip[1] ** 2 + currentTip[2] ** 2).toFixed(2),
                    componentsLabel: `(${currentTip[0].toFixed(1)}, ${currentTip[1].toFixed(1)})`,
                    isResultant: true,
                    color: '#facc15' // Yellow
                });
            }

            // 4. Generate Traces & Annotations
            const traces = [];
            const annotations = [];
            let xMin = 0, xMax = 0, yMin = 0, yMax = 0, zMin = 0, zMax = 0;

            processedVectors.forEach((v, idx) => {
                const s = v.realStart;
                const e = v.realEnd;

                // Update Bounds
                xMin = Math.min(xMin, s[0], e[0]); xMax = Math.max(xMax, s[0], e[0]);
                yMin = Math.min(yMin, s[1], e[1]); yMax = Math.max(yMax, s[1], e[1]);
                zMin = Math.min(zMin, s[2], e[2]); zMax = Math.max(zMax, s[2], e[2]);

                const text = `${v.label}<br>|${v.label}|=${v.magnitude}<br>${v.componentsLabel}`;
                const color = v.color || (idx === 0 ? '#38bdf8' : '#ef4444'); // Blue then Red default

                if (is3D) {
                    // 3D: Line + Marker (Cone-ish)
                    traces.push({
                        type: 'scatter3d',
                        mode: 'lines+markers',
                        x: [s[0], e[0]],
                        y: [s[1], e[1]],
                        z: [s[2], e[2]],
                        line: { width: 6, color: color, dash: v.isResultant ? 'dash' : 'solid' },
                        marker: { size: 4, color: color }, // Tip marker
                        name: v.label,
                        hoverinfo: 'text',
                        hovertext: text
                    });
                    // Add logic for separate cone if needed, but line+marker is okay strictly speaking
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
                        text: showLabels ? v.label : "",
                        font: { color: color, size: 14, weight: 'bold' },
                        startstandoff: 0
                    });
                }
            });

            // Padding for bounds
            const pad = 1.0;
            xMin -= pad; xMax += pad;
            yMin -= pad; yMax += pad;
            zMin -= pad; zMax += pad;

            const layout = {
                title: data.math?.expression || "Vector Visualization",
                autosize: true,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#e2e8f0' },
                margin: { l: 20, r: 20, t: 40, b: 20 },
                showlegend: true,
                legend: { orientation: 'h', y: 0 },
                // 2D Axes
                xaxis: {
                    range: [xMin, xMax],
                    gridcolor: '#334155', zerolinecolor: '#94a3b8', zeroline: true
                },
                yaxis: {
                    range: [yMin, yMax],
                    gridcolor: '#334155', zerolinecolor: '#94a3b8', zeroline: true,
                    scaleanchor: "x"
                },
                // 3D Axes
                scene: {
                    xaxis: { range: [xMin, xMax], backgroundcolor: "rgba(0,0,0,0)", gridcolor: '#334155' },
                    yaxis: { range: [yMin, yMax], backgroundcolor: "rgba(0,0,0,0)", gridcolor: '#334155' },
                    zaxis: { range: [zMin, zMax], backgroundcolor: "rgba(0,0,0,0)", gridcolor: '#334155' },
                    camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                },
                annotations: is3D ? [] : annotations
            };

            return { plotData: traces, plotLayout: layout };

        } catch (err) {
            console.error("VectorCalc Error:", err);
            return { plotData: [], plotLayout: {}, error: err.message };
        }
    }, [data, showHeadToTail, showResultant, showLabels, scale, is3D]);


    return (
        <div className="w-full h-full relative">
            {/* UI Controls Overlay */}
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

            <SafePlot
                data={plotData}
                layout={plotLayout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
                config={{ responsive: true, displayModeBar: false }}
            />
        </div>
    );
};

export default VectorPlotRenderer;
