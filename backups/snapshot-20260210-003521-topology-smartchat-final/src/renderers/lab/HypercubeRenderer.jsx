import React, { useState, useMemo } from "react";
import SafePlot from "../../components/SafePlot";
import { Info } from "lucide-react";

const HypercubeRenderer = () => {
    const [angleYW, setAngleYW] = useState(0); // Rotation in YW plane
    const [angleXW, setAngleXW] = useState(0); // Rotation in XW plane
    const [showDocs, setShowDocs] = useState(true);

    const { plotData } = useMemo(() => {
        // 1. Generate Tesseract Vertices (4D) - 16 points
        // (+-1, +-1, +-1, +-1)
        const vertices = [];
        for (let x = -1; x <= 1; x += 2) {
            for (let y = -1; y <= 1; y += 2) {
                for (let z = -1; z <= 1; z += 2) {
                    for (let w = -1; w <= 1; w += 2) {
                        vertices.push([x, y, z, w]);
                    }
                }
            }
        }

        // 2. Define Edges (Connect if distance is 2, i.e., differ by 1 coord)
        const edges = [];
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                let diff = 0;
                for (let k = 0; k < 4; k++) {
                    if (vertices[i][k] !== vertices[j][k]) diff++;
                }
                if (diff === 1) {
                    edges.push([i, j]);
                }
            }
        }

        // 3. Rotation Matrices
        const rotate = (p) => {
            let [x, y, z, w] = p;

            // XW Rotation
            const radXW = angleXW * Math.PI / 180;
            const cxw = Math.cos(radXW), sxw = Math.sin(radXW);
            // x' = x cos - w sin
            // w' = x sin + w cos
            let x1 = x * cxw - w * sxw;
            let w1 = x * sxw + w * cxw;
            let y1 = y;
            let z1 = z;

            // YW Rotation
            const radYW = angleYW * Math.PI / 180;
            const cyw = Math.cos(radYW), syw = Math.sin(radYW);
            // y' = y cos - w sin
            // w' = y sin + w cos
            let y2 = y1 * cyw - w1 * syw;
            let w2 = y1 * syw + w1 * cyw;

            return [x1, y2, z1, w2];
        };

        // 4. Project 4D -> 3D
        // Simple Perspective: Scale by 1 / (d - w)
        const transformedVertices = vertices.map(v => {
            const [rx, ry, rz, rw] = rotate(v);
            const distance = 3; // Camera distance from 4D origin
            const scale = 1 / (distance - rw);
            return [rx * scale, ry * scale, rz * scale];
        });

        // 5. Build Trace
        const xEdge = [], yEdge = [], zEdge = [];

        edges.forEach(([i, j]) => {
            const v1 = transformedVertices[i];
            const v2 = transformedVertices[j];
            xEdge.push(v1[0], v2[0], null); // null breaks the line
            yEdge.push(v1[1], v2[1], null);
            zEdge.push(v1[2], v2[2], null);
        });

        // Vertices Markers
        const xv = transformedVertices.map(v => v[0]);
        const yv = transformedVertices.map(v => v[1]);
        const zv = transformedVertices.map(v => v[2]);

        // Highlight Vertex 0
        const v0 = transformedVertices[0];

        return {
            plotData: [
                // Edges
                {
                    x: xEdge, y: yEdge, z: zEdge,
                    type: 'scatter3d',
                    mode: 'lines',
                    line: { color: '#00e5ff', width: 4 },
                    name: 'Edges',
                    hoverinfo: 'none'
                },
                // Vertices
                {
                    x: xv, y: yv, z: zv,
                    type: 'scatter3d',
                    mode: 'markers',
                    marker: { size: 5, color: '#facc15' },
                    name: 'Vertices' // Outer vs inner hints
                },
                // Highlighted Vertex
                {
                    x: [v0[0]], y: [v0[1]], z: [v0[2]],
                    type: 'scatter3d',
                    mode: 'markers',
                    marker: { size: 10, color: '#ef4444' }, // Red big dot
                    name: 'Tracked Vertex'
                }
            ]
        };

    }, [angleYW, angleXW]);

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Explanation Overlay */}
            {showDocs && (
                <div className="absolute top-4 right-4 z-20 w-72 lab-panel">
                    <div className="lab-panel-header">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">What is this?</h3>
                        <button onClick={() => setShowDocs(false)} className="lab-btn text-xs">Close</button>
                    </div>
                    <div className="lab-panel-body">
                        <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">
                            This is a <strong className="text-emerald-400">3D shadow</strong> of a 4D Hypercube (Tesseract).
                            Just as a 3D cube casts a 2D shadow, a 4D cube casts a 3D shadow.
                        </p>
                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                            <p><strong className="text-blue-400">YW Rotation:</strong> Rotates the object through the 4th dimension (W), creating the "inside-out" effect.</p>
                            <p><strong className="text-red-400">Red Dot:</strong> Tracks a single vertex to help you follow the motion.</p>
                        </div>
                    </div>
                </div>
            )}

            {!showDocs && (
                <button
                    onClick={() => setShowDocs(true)}
                    className="absolute top-4 right-4 z-20 lab-btn"
                    title="Show info"
                >
                    <Info size={16} className="text-blue-400" />
                </button>
            )}

            {/* Controls */}
            <div className="lab-controls z-10">
                <div className="lab-range">
                    <label className="text-xs text-[var(--text-muted)] flex justify-between">
                        <span>YW Rotation (4D)</span>
                        <span className="text-blue-400 font-mono">{angleYW}deg</span>
                    </label>
                    <input
                        type="range" min="0" max="360" step="1"
                        value={angleYW} onChange={e => setAngleYW(Number(e.target.value))}
                    />
                </div>
                <div className="lab-range">
                    <label className="text-xs text-[var(--text-muted)] flex justify-between">
                        <span>XW Rotation (4D)</span>
                        <span className="text-purple-400 font-mono">{angleXW}deg</span>
                    </label>
                    <input
                        type="range" min="0" max="360" step="1"
                        value={angleXW} onChange={e => setAngleXW(Number(e.target.value))}
                    />
                </div>
                <div className="ml-auto lab-overlay-pill">
                    4D Projection
                </div>
            </div>

            <div className="flex-1">
                <SafePlot
                    data={plotData}
                    layout={{
                        autosize: true,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: '#e2e8f0' },
                        margin: { l: 0, r: 0, t: 0, b: 0 },
                        scene: {
                            xaxis: { visible: false, range: [-2, 2] },
                            yaxis: { visible: false, range: [-2, 2] },
                            zaxis: { visible: false, range: [-2, 2] },
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

export default HypercubeRenderer;
