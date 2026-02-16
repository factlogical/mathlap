import { useEffect, useMemo, useRef, useState } from "react";
import Plotly from "plotly.js-dist-min";
import { calculateTangentPlane } from "../utils/derivative3DEngine";

function linspace(min, max, count) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || count < 2) return [min, max];
    const output = [];
    const step = (max - min) / (count - 1);
    for (let i = 0; i < count; i += 1) {
        output.push(min + step * i);
    }
    return output;
}

export default function DerivativeCanvas3D({
    engine,
    a,
    b,
    xDomain,
    yDomain,
    patchSize,
    showSurface,
    showPlane,
    showNormal,
    highlight,
    cameraPreset = "iso"
}) {
    const wrapperRef = useRef(null);
    const plotRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    const cameraEye = useMemo(() => {
        switch (cameraPreset) {
            case "top":
                return { x: 0.01, y: 0.01, z: 2.2 };
            case "front":
                return { x: 0.01, y: -2.2, z: 0.75 };
            case "side":
                return { x: 2.2, y: 0.01, z: 0.75 };
            case "iso":
            default:
                return { x: 1.6, y: 1.5, z: 1.2 };
        }
    }, [cameraPreset]);

    const plotPayload = useMemo(() => {
        const xRange = Array.isArray(xDomain) ? xDomain : [-5, 5];
        const yRange = Array.isArray(yDomain) ? yDomain : [-5, 5];
        const sampleCount = size.width >= 1100 || size.height >= 650 ? 72 : 55;

        const baseLayout = {
            autosize: false,
            width: Math.max(10, size.width),
            height: Math.max(10, size.height),
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            margin: { l: 0, r: 0, t: 6, b: 0 },
            font: { color: "#e2e8f0" },
            legend: {
                orientation: "h",
                y: 0.99,
                x: 0.02,
                bgcolor: "rgba(15,23,42,0.55)",
                bordercolor: "rgba(148,163,184,0.24)",
                borderwidth: 1
            },
            scene: {
                xaxis: {
                    title: "x",
                    range: xRange,
                    gridcolor: "rgba(148,163,184,0.25)",
                    zerolinecolor: "rgba(226,232,240,0.55)",
                    showbackground: true,
                    backgroundcolor: "rgba(15,23,42,0.45)"
                },
                yaxis: {
                    title: "y",
                    range: yRange,
                    gridcolor: "rgba(148,163,184,0.25)",
                    zerolinecolor: "rgba(226,232,240,0.55)",
                    showbackground: true,
                    backgroundcolor: "rgba(15,23,42,0.45)"
                },
                zaxis: {
                    title: "z",
                    gridcolor: "rgba(148,163,184,0.25)",
                    zerolinecolor: "rgba(226,232,240,0.55)",
                    showbackground: true,
                    backgroundcolor: "rgba(2,6,23,0.35)"
                },
                camera: { eye: cameraEye },
                bgcolor: "rgba(2,6,23,0.75)",
                aspectmode: "cube"
            },
            uirevision: "derivative-3d"
        };

        if (!engine || engine.error) {
            return {
                data: [],
                layout: baseLayout,
                error: engine?.error || "3D engine failed to initialize.",
                tangent: null
            };
        }

        const xVals = linspace(xRange[0], xRange[1], sampleCount);
        const yVals = linspace(yRange[0], yRange[1], sampleCount);
        const zMatrix = yVals.map((y) =>
            xVals.map((x) => {
                const z = engine.evalF(x, y);
                return Number.isFinite(z) ? z : null;
            })
        );

        const tangent = calculateTangentPlane(engine, a, b, patchSize);
        const traces = [];

        // Reference plane z=0 improves depth perception.
        traces.push({
            type: "surface",
            x: [xRange[0], xRange[1]],
            y: [yRange[0], yRange[1]],
            z: [
                [0, 0],
                [0, 0]
            ],
            colorscale: [[0, "#94a3b8"], [1, "#94a3b8"]],
            opacity: 0.12,
            showscale: false,
            hoverinfo: "skip",
            name: "z=0"
        });

        if (showSurface) {
            traces.push({
                type: "surface",
                x: xVals,
                y: yVals,
                z: zMatrix,
                colorscale: [
                    [0, "#0f172a"],
                    [0.35, "#0ea5e9"],
                    [0.7, "#22d3ee"],
                    [1, "#93c5fd"]
                ],
                opacity: highlight === "surface" ? 0.95 : 0.84,
                name: "Surface",
                showscale: false,
                contours: {
                    z: {
                        show: true,
                        width: 1,
                        color: "rgba(15, 23, 42, 0.55)"
                    }
                },
                lighting: {
                    ambient: 0.6,
                    diffuse: 0.65,
                    fresnel: 0.2,
                    roughness: 0.45,
                    specular: 0.35
                },
                lightposition: { x: 120, y: 180, z: 260 }
            });
        }

        if (!tangent.error) {
            const point = tangent.point;
            const corners = tangent.corners;

            if (showPlane) {
                traces.push({
                    type: "mesh3d",
                    x: corners.map((c) => c.x),
                    y: corners.map((c) => c.y),
                    z: corners.map((c) => c.z),
                    i: [0, 0],
                    j: [1, 2],
                    k: [2, 3],
                    color: highlight === "plane" ? "#f59e0b" : "#fb7185",
                    opacity: highlight === "plane" ? 0.68 : 0.52,
                    name: "Tangent Plane",
                    flatshading: true
                });
            }

            traces.push({
                type: "scatter3d",
                mode: "markers",
                x: [point.x],
                y: [point.y],
                z: [point.z],
                marker: { size: 7, color: "#f472b6", line: { color: "#ffffff", width: 1.5 } },
                name: "Touch Point",
                hovertemplate: "a=%{x:.3f}<br>b=%{y:.3f}<br>z=%{z:.3f}<extra></extra>"
            });

            if (showNormal) {
                const span = Math.max(1, (Math.abs(xRange[1] - xRange[0]) + Math.abs(yRange[1] - yRange[0])) / 10);
                const nx = tangent.normalVector.x * span;
                const ny = tangent.normalVector.y * span;
                const nz = tangent.normalVector.z * span;
                const normalEnd = { x: point.x + nx, y: point.y + ny, z: point.z + nz };
                const normalColor = highlight === "normal" ? "#facc15" : "#38bdf8";

                traces.push({
                    type: "scatter3d",
                    mode: "lines+markers",
                    x: [point.x, normalEnd.x],
                    y: [point.y, normalEnd.y],
                    z: [point.z, normalEnd.z],
                    line: { color: normalColor, width: highlight === "normal" ? 8 : 6 },
                    marker: { size: 2, color: normalColor },
                    name: "Normal"
                });

                traces.push({
                    type: "cone",
                    x: [normalEnd.x],
                    y: [normalEnd.y],
                    z: [normalEnd.z],
                    u: [nx],
                    v: [ny],
                    w: [nz],
                    sizemode: "absolute",
                    sizeref: 0.35,
                    anchor: "tip",
                    colorscale: [[0, normalColor], [1, normalColor]],
                    showscale: false,
                    name: "Normal Tip"
                });
            }
        }

        return {
            data: traces,
            layout: baseLayout,
            error: tangent.error || null,
            tangent
        };
    }, [engine, a, b, xDomain, yDomain, patchSize, showSurface, showPlane, showNormal, highlight, size.width, size.height, cameraEye]);

    useEffect(() => {
        if (!wrapperRef.current) return;

        const updateSize = () => {
            if (!wrapperRef.current) return;
            const rect = wrapperRef.current.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.floor(rect.height);
            if (width > 0 && height > 0) {
                setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(wrapperRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!plotRef.current) return;
        if (size.width < 40 || size.height < 40) return;
        const plotGlPixelRatio = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
        Plotly.react(
            plotRef.current,
            plotPayload.data,
            plotPayload.layout,
            {
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                plotGlPixelRatio,
                modeBarButtonsToRemove: ["lasso2d", "select2d"]
            }
        );
    }, [plotPayload, size.width, size.height]);

    useEffect(() => {
        const handleResize = () => {
            if (plotRef.current) {
                Plotly.Plots.resize(plotRef.current);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const plotNode = plotRef.current;
        return () => {
            if (plotNode) {
                Plotly.purge(plotNode);
            }
        };
    }, []);

    return (
        <div ref={wrapperRef} className="derivative-canvas derivative-canvas-3d-wrapper">
            <div ref={plotRef} className="derivative-canvas-3d" />
            {plotPayload.error && (
                <div className="derivative-3d-error">
                    {plotPayload.error}
                </div>
            )}
        </div>
    );
}
