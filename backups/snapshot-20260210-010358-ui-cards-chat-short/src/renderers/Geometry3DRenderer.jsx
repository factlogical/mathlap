import SafePlot from "../components/SafePlot";
import { useState, useEffect, useRef, useMemo } from "react";
import "katex/dist/katex.min.css";
import { Info, Plus, Play, Pause, ArrowRight, MousePointer2 } from "lucide-react";

export default function Geometry3DRenderer({ spec }) {
    // --- 1. State ---
    const [vectors, setVectors] = useState(spec.payload?.vectors || []);
    const [points, setPoints] = useState(spec.payload?.points || []);
    const [isRotating, setIsRotating] = useState(true);

    // Input state (using strings to handle negative signs/empty states correctly)
    const [newPoint, setNewPoint] = useState({ x: "0", y: "0", z: "0" });
    const [isVectorMode, setIsVectorMode] = useState(false); // Toggle between Point / Vector

    // Animation Refs
    const requestRef = useRef();
    const angleRef = useRef(0);

    const [displayVectors, setDisplayVectors] = useState([]);
    const animationStartTime = useRef(null);

    useEffect(() => {
        let initialVectors = spec.payload?.vectors || [];
        setVectors(initialVectors);
        setPoints(spec.payload?.points || []);

        // Transformation check
        const original = initialVectors.find(v => v.label === "Original");
        const transformed = initialVectors.find(v => v.label === "Transformed");
        if (original && transformed) {
            setDisplayVectors(initialVectors.map(v =>
                v.label === "Transformed" ? { ...v, x: original.x, y: original.y, z: original.z } : v
            ));
            animationStartTime.current = performance.now();
        } else {
            setDisplayVectors(initialVectors);
            animationStartTime.current = null;
        }
    }, [spec]);

    // --- 2. Animation Loop ---
    useEffect(() => {
        const animate = (time) => {
            if (isRotating) angleRef.current += 0.005;

            // Transformation Lerp
            let currentVectors = vectors;
            if (animationStartTime.current) {
                const elapsed = time - animationStartTime.current;
                const progress = Math.min(elapsed / 1500, 1);
                const ease = 1 - Math.pow(1 - progress, 3);

                const original = vectors.find(v => v.label === "Original");
                const target = vectors.find(v => v.label === "Transformed");

                if (original && target) {
                    const currentX = original.x + (target.x - original.x) * ease;
                    const currentY = original.y + (target.y - original.y) * ease;
                    const currentZ = original.z + (target.z - original.z) * ease;
                    currentVectors = vectors.map(v => v.label === "Transformed" ? { ...v, x: currentX, y: currentY, z: currentZ } : v);
                    if (progress >= 1) animationStartTime.current = null;
                }
            }
            setDisplayVectors(currentVectors);

            // Camera Update
            setLayout(prev => ({
                ...prev,
                scene: {
                    ...prev.scene,
                    camera: {
                        ...prev.scene.camera, eye: {
                            x: 1.8 * Math.cos(angleRef.current),
                            y: 1.8 * Math.sin(angleRef.current),
                            z: 1.2
                        }
                    }
                }
            }));

            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isRotating, vectors]);


    // --- 3. Build Traces ---
    const { plotData, baseLayout } = useMemo(() => {
        const traces = [];

        // A. Basis Vectors (Axes)
        const axes = [
            { axis: "X", x: 1, y: 0, z: 0, color: "#ef4444" }, // Red
            { axis: "Y", x: 0, y: 1, z: 0, color: "#22c55e" }, // Green
            { axis: "Z", x: 0, y: 0, z: 1, color: "#3b82f6" }  // Blue
        ];
        axes.forEach(ax => {
            traces.push({
                type: "scatter3d", mode: "lines",
                x: [0, ax.x], y: [0, ax.y], z: [0, ax.z],
                line: { width: 4, color: ax.color },
                hoverinfo: "text", text: `${ax.axis}-Axis`, showlegend: false
            });
            traces.push({
                type: "cone", x: [ax.x], y: [ax.y], z: [ax.z], u: [ax.x], v: [ax.y], w: [ax.z],
                sizemode: "absolute", sizeref: 0.2, anchor: "tip",
                colorscale: [[0, ax.color], [1, ax.color]], showscale: false,
                hoverinfo: "none", showlegend: false
            });
        });

        // B. Points (and Drop Lines)
        if (points.length > 0) {
            // Markers
            traces.push({
                type: "scatter3d", mode: "markers",
                x: points.map(p => p.x), y: points.map(p => p.y), z: points.map(p => p.z),
                hoverinfo: "text",
                hovertext: points.map(p => `<b>${p.label || "Point"}</b><br>(${p.x}, ${p.y}, ${p.z})`),
                marker: { size: 6, color: points.map(p => p.color || "#60a5fa"), opacity: 0.9, line: { color: "white", width: 1 } },
                name: "Points"
            });

            // Visual "Drop Lines" to floor (z=0) for depth perception
            points.forEach(p => {
                traces.push({
                    type: "scatter3d", mode: "lines",
                    x: [p.x, p.x], y: [p.y, p.y], z: [p.z, 0],
                    line: { width: 1, color: "rgba(255,255,255,0.2)", dash: "dash" },
                    hoverinfo: "none", showlegend: false
                });
            });
        }

        // C. Vectors
        displayVectors.forEach((v, idx) => {
            const color = v.color || (idx % 2 === 0 ? "#06b6d4" : "#d946ef");
            traces.push({
                type: "scatter3d", mode: "lines",
                x: [0, v.x], y: [0, v.y], z: [0, v.z],
                line: { width: 8, color: color },
                hoverinfo: "skip", showlegend: false
            });
            traces.push({
                type: "cone",
                x: [v.x], y: [v.y], z: [v.z], u: [v.x], v: [v.y], w: [v.z],
                sizemode: "absolute", sizeref: 0.3, anchor: "tip",
                colorscale: [[0, color], [1, color]], showscale: false,
                name: v.label || `Vector ${idx + 1}`,
                hoverinfo: "text", text: `<b>${v.label || "Vector"}</b><br>(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`
            });
        });

        const layout = {
            autosize: true,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "#94a3b8", family: "Inter" },
            margin: { l: 0, r: 0, t: 0, b: 0 },
            showlegend: true, legend: { x: 0, y: 1, bgcolor: 'rgba(0,0,0,0)' },
            scene: {
                xaxis: { title: "", backgroundcolor: "rgba(0,0,0,0)", gridcolor: "rgba(255,255,255,0.1)", zerolinecolor: "rgba(255,255,255,0.2)", showticklabels: false },
                yaxis: { title: "", backgroundcolor: "rgba(0,0,0,0)", gridcolor: "rgba(255,255,255,0.1)", zerolinecolor: "rgba(255,255,255,0.2)", showticklabels: false },
                zaxis: { title: "", backgroundcolor: "rgba(0,0,0,0)", gridcolor: "rgba(255,255,255,0.1)", zerolinecolor: "rgba(255,255,255,0.2)", showticklabels: false },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } },
                aspectmode: 'cube'
            }
        };

        return { plotData: traces, baseLayout: layout };
    }, [points, displayVectors]);

    const [layout, setLayout] = useState(baseLayout);

    // Handlers
    const handleAddParams = () => {
        const p = { x: Number(newPoint.x), y: Number(newPoint.y), z: Number(newPoint.z) };
        if (isVectorMode) {
            setVectors([...vectors, { ...p, label: "User Vector", color: "#facc15" }]); // yellow
        } else {
            setPoints([...points, { ...p, label: "User Point", color: "#4ade80" }]); // green
        }
    };

    const handleInputChange = (axis, val) => {
        setNewPoint(prev => ({ ...prev, [axis]: val }));
    };

    return (
        <div className="flex flex-col h-full text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-8 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></span>
                    <span className="tracking-wide">{spec.title || "3D Geometry"}</span>
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsRotating(!isRotating)} className={`p-2 rounded-lg transition-all ${isRotating ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 bg-white/5"}`}>
                        {isRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Plot */}
            <div className="flex-1 min-h-[300px] rounded-xl border border-white/10 overflow-hidden relative shadow-2xl bg-gradient-to-br from-[#0b1020]/80 to-[#1e1b4b]/80 backdrop-blur-md">
                <SafePlot
                    data={plotData}
                    layout={{ ...layout, uirevision: "true" }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                    config={{ displayModeBar: true, displaylogo: false }}
                />
                {animationStartTime.current && (
                    <div className="absolute top-4 left-4 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-mono animate-pulse">
                        TRANSFORMING...
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                <div className="flex flex-col lg:flex-row items-center gap-4">

                    {/* Type Switcher */}
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setIsVectorMode(false)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${!isVectorMode ? "bg-cyan-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            <MousePointer2 className="w-3 h-3" /> Point
                        </button>
                        <button
                            onClick={() => setIsVectorMode(true)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${isVectorMode ? "bg-yellow-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            <ArrowRight className="w-3 h-3" /> Vector
                        </button>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 flex gap-2 w-full">
                        {['x', 'y', 'z'].map(axis => (
                            <div key={axis} className="relative w-full">
                                <span className="absolute left-2 top-2 text-[10px] text-gray-500 font-bold">{axis.toUpperCase()}</span>
                                <input
                                    type="number" // can be text if we want full manual control, but number usually fine on modern browsers if string state
                                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-2 pl-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-white font-mono"
                                    value={newPoint[axis]}
                                    onChange={e => handleInputChange(axis, e.target.value)}
                                />
                            </div>
                        ))}
                        <button onClick={handleAddParams} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg border border-white/10 transition-all">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="hidden lg:flex gap-3 text-[10px] text-gray-500 font-mono border-l border-white/10 pl-4">
                        <div>PTS: {points.length}</div>
                        <div>VEC: {displayVectors.length}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
