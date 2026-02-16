import React, { useState, useMemo } from "react";
import SafePlot from "../../components/SafePlot";
import * as math from "mathjs";

const SHAPES = {
    mobius: {
        name: "Möbius Strip",
        u: [0, 2 * Math.PI], // 0 to 2pi
        v: [-1, 1],          // Width
        eq: (u, v) => {
            const x = (1 + v / 2 * Math.cos(u / 2)) * Math.cos(u);
            const y = (1 + v / 2 * Math.cos(u / 2)) * Math.sin(u);
            const z = v / 2 * Math.sin(u / 2);
            return [x, y, z];
        },
        desc: "A non-orientable surface with only one side and one edge."
    },
    torus: {
        name: "Torus",
        u: [0, 2 * Math.PI],
        v: [0, 2 * Math.PI],
        eq: (u, v) => {
            const R = 3, r = 1;
            const x = (R + r * Math.cos(v)) * Math.cos(u);
            const y = (R + r * Math.cos(v)) * Math.sin(u);
            const z = r * Math.sin(v);
            return [x, y, z];
        },
        desc: "A product of two circles. Topologically distinct from a sphere."
    },
    klein: {
        name: "Klein Bottle (Figure-8)",
        u: [0, 2 * Math.PI],
        v: [0, 2 * Math.PI],
        eq: (u, v) => {
            // Figure-8 immersion
            const r = 2;
            const x = (r + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u);
            const y = (r + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u);
            const z = Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v);
            return [x, y, z];
        },
        desc: "A non-orientable surface where inside and outside are the same. (Figure-8 Immersion)"
    }
};

const ManifoldRenderer = () => {
    const [activeShape, setActiveShape] = useState('mobius');
    const [resolution, setResolution] = useState(50);
    const [uMax, setUMax] = useState(100); // Percentage 0-100 of range
    const [opacity, setOpacity] = useState(0.8);

    const { plotData, description } = useMemo(() => {
        const shape = SHAPES[activeShape];
        const uRange = shape.u;
        const vRange = shape.v;

        // Calculate effective U range based on slider
        const uEnd = uRange[0] + (uRange[1] - uRange[0]) * (uMax / 100);

        const x = [], y = [], z = [];

        // Grid Generation
        const uStep = (uRange[1] - uRange[0]) / resolution;
        const vStep = (vRange[1] - vRange[0]) / (resolution / 2); // Less resolution needed for width usually

        for (let u = uRange[0]; u <= uEnd; u += uStep) {
            const rowX = [], rowY = [], rowZ = [];
            for (let v = vRange[0]; v <= vRange[1]; v += vStep) {
                const [px, py, pz] = shape.eq(u, v);
                rowX.push(px);
                rowY.push(py);
                rowZ.push(pz);
            }
            x.push(rowX);
            y.push(rowY);
            z.push(rowZ);
        }

        return {
            description: shape.desc,
            plotData: [{
                type: 'surface',
                x: x,
                y: y,
                z: z,
                colorscale: 'Viridis',
                opacity: opacity,
                showscale: false,
                contours: {
                    x: { show: true, color: '#ffffff', width: 2, highlight: true },
                    y: { show: true, color: '#ffffff', width: 2, highlight: true },
                    z: { show: false }
                }
            }]
        };
    }, [activeShape, resolution, uMax, opacity]);

    return (
        <div className="flex h-full w-full bg-[var(--panel-2)] text-white">
            {/* Left Controls */}
            <div className="w-80 border-r border-[var(--border)] flex flex-col lab-panel p-6 gap-6">
                <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 block">Manifold Type</label>
                    <div className="flex flex-col gap-2">
                        {Object.keys(SHAPES).map(key => (
                            <button
                                key={key}
                                onClick={() => setActiveShape(key)}
                                className={`p-3 rounded-lg text-left transition-all text-sm ${activeShape === key ? 'bg-blue-600 text-white shadow-lg' : 'bg-[var(--bg-surface)] text-slate-300 hover:bg-[var(--bg-surface-hover)]'}`}
                            >
                                {SHAPES[key].name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                    <h3 className="text-sm font-bold text-slate-200 mb-2">Description</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="flex justify-between text-xs text-slate-400 mb-2">
                            <span>Construction Loop (U)</span>
                            <span>{uMax}%</span>
                        </label>
                        <input
                            type="range" min="1" max="100" value={uMax} onChange={e => setUMax(Number(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>

                    <div>
                        <label className="flex justify-between text-xs text-slate-400 mb-2">
                            <span>Transparency</span>
                            <span>{Math.round(opacity * 100)}%</span>
                        </label>
                        <input
                            type="range" min="0.1" max="1.0" step="0.1" value={opacity} onChange={e => setOpacity(Number(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                </div>
            </div>

            {/* Right Viewport */}
            <div className="flex-1 relative bg-[var(--panel-2)]">
                <SafePlot
                    data={plotData}
                    layout={{
                        autosize: true,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: '#e2e8f0' },
                        margin: { l: 0, r: 0, t: 0, b: 0 },
                        scene: {
                            xaxis: { visible: false },
                            yaxis: { visible: false },
                            zaxis: { visible: false },
                            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                        },
                        showlegend: false
                    }}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler={true}
                    config={{ displayModeBar: false }}
                />
            </div>
        </div>
    );
};

export default ManifoldRenderer;
