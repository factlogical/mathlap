import { normalizeFunctionExpression } from "../utils/actionValidator";

const PRESETS_2D = [
    { name: "x^2", func: "x^2", a: 2 },
    { name: "x^3", func: "x^3", a: 1 },
    { name: "sin(x)", func: "sin(x)", a: 0.8 },
    { name: "cos(x)", func: "cos(x)", a: 0 },
    { name: "exp(x)", func: "e^x", a: 0 }
];

const PRESETS_3D = [
    "x^2 + y^2",
    "sin(x) * cos(y)",
    "x^2 - y^2",
    "x * y",
    "sqrt(abs(x*y))"
];

const CAMERA_PRESETS = [
    { id: "iso", label: "ISO" },
    { id: "top", label: "TOP" },
    { id: "front", label: "FRONT" },
    { id: "side", label: "SIDE" }
];

export default function ControlPanel({
    state,
    data2D,
    data3D,
    onStateChange,
    onAnimate,
    onReset
}) {
    const apply2DFunction = () => {
        const normalized = normalizeFunctionExpression(state.func);
        if (!normalized) return;
        onStateChange((prev) => ({ ...prev, func: normalized }));
    };

    const apply3DFunction = () => {
        const normalized = normalizeFunctionExpression(state.func3D);
        if (!normalized) return;
        onStateChange((prev) => ({ ...prev, func3D: normalized }));
    };

    return (
        <div className="control-panel">
            <div className="derivative-mode-switch">
                <button
                    type="button"
                    className={state.mode === "2D" ? "active" : ""}
                    onClick={() => onStateChange((prev) => ({ ...prev, mode: "2D" }))}
                >
                    2D View
                </button>
                <button
                    type="button"
                    className={state.mode === "3D" ? "active" : ""}
                    onClick={() => onStateChange((prev) => ({ ...prev, mode: "3D" }))}
                >
                    3D Tangent Plane
                </button>
            </div>

            {state.mode === "2D" ? (
                <>
                    <div className="func-input-group">
                        <label>f(x)</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                                value={state.func}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, func: event.target.value }))
                                }
                                onKeyDown={(event) => event.key === "Enter" && apply2DFunction()}
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={apply2DFunction}>Apply</button>
                        </div>
                    </div>

                    <div className="presets">
                        <label>2D Presets</label>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {PRESETS_2D.map((preset) => (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                        onStateChange((prev) => ({
                                            ...prev,
                                            func: preset.func,
                                            a: preset.a
                                        }));
                                    }}
                                    style={{ padding: "0.25rem 0.75rem" }}
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="slider-group">
                        <label>a = {state.a.toFixed(2)}</label>
                        <input
                            type="range"
                            min="-5"
                            max="5"
                            step="0.1"
                            value={state.a}
                            onChange={(event) =>
                                onStateChange((prev) => ({ ...prev, a: parseFloat(event.target.value) }))
                            }
                        />
                    </div>

                    <div className="slider-group">
                        <label>h = {state.h.toFixed(3)}</label>
                        <input
                            type="range"
                            min="-3"
                            max="3"
                            step="0.01"
                            value={state.h}
                            onChange={(event) => {
                                let next = parseFloat(event.target.value);
                                if (Math.abs(next) < 0.01) next = next >= 0 ? 0.01 : -0.01;
                                onStateChange((prev) => ({ ...prev, h: next }));
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={onAnimate}
                        disabled={state.isAnimating}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            background: state.isAnimating ? "#94a3b8" : "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: state.isAnimating ? "not-allowed" : "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        {state.isAnimating ? "Animating..." : "Animate secant -> tangent"}
                    </button>

                    <div className="toggles">
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                                type="checkbox"
                                checked={state.showSecant}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, showSecant: event.target.checked }))
                                }
                            />
                            Secant
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                                type="checkbox"
                                checked={state.showTangent}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, showTangent: event.target.checked }))
                                }
                            />
                            Tangent
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                                type="checkbox"
                                checked={state.showTriangle}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, showTriangle: event.target.checked }))
                                }
                            />
                            Triangle
                        </label>
                    </div>

                    {data2D && !data2D.error && (
                        <div className="calculations">
                            <h4>2D Metrics</h4>
                            <div style={{ fontSize: "0.9em", fontFamily: "monospace" }}>
                                <div>f(a) = {data2D.fa.toFixed(4)}</div>
                                <div>f(a + h) = {data2D.fah.toFixed(4)}</div>
                                <div><strong>Secant slope:</strong> {data2D.slope_secant.toFixed(4)}</div>
                                {data2D.isDerivableAtA && (
                                    <div><strong>Tangent slope:</strong> {data2D.slope_tangent.toFixed(4)}</div>
                                )}
                                {!data2D.isDerivableAtA && (
                                    <div style={{ color: "#fca5a5" }}>Derivative is not stable at point a.</div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="func-input-group">
                        <label>f(x, y)</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                                value={state.func3D}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, func3D: event.target.value }))
                                }
                                onKeyDown={(event) => event.key === "Enter" && apply3DFunction()}
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={apply3DFunction}>Apply</button>
                        </div>
                    </div>

                    <div className="presets">
                        <label>3D Presets</label>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {PRESETS_3D.map((expr) => (
                                <button
                                    key={expr}
                                    type="button"
                                    onClick={() => {
                                        onStateChange((prev) => ({ ...prev, func3D: expr }));
                                    }}
                                    style={{ padding: "0.25rem 0.75rem" }}
                                >
                                    {expr}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="slider-group">
                        <label>a (x-point) = {state.a.toFixed(2)}</label>
                        <input
                            type="range"
                            min={state.xDomain3D[0]}
                            max={state.xDomain3D[1]}
                            step="0.1"
                            value={state.a}
                            onChange={(event) =>
                                onStateChange((prev) => ({ ...prev, a: parseFloat(event.target.value) }))
                            }
                        />
                    </div>

                    <div className="slider-group">
                        <label>b (y-point) = {state.b.toFixed(2)}</label>
                        <input
                            type="range"
                            min={state.yDomain3D[0]}
                            max={state.yDomain3D[1]}
                            step="0.1"
                            value={state.b}
                            onChange={(event) =>
                                onStateChange((prev) => ({ ...prev, b: parseFloat(event.target.value) }))
                            }
                        />
                    </div>

                    <div className="slider-group">
                        <label>patch size = {state.patchSize3D.toFixed(2)}</label>
                        <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={state.patchSize3D}
                            onChange={(event) =>
                                onStateChange((prev) => ({ ...prev, patchSize3D: parseFloat(event.target.value) }))
                            }
                        />
                    </div>

                    <div className="toggles">
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                                type="checkbox"
                                checked={state.showSurface3D}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, showSurface3D: event.target.checked }))
                                }
                            />
                            Surface
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                                type="checkbox"
                                checked={state.showPlane3D}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, showPlane3D: event.target.checked }))
                                }
                            />
                            Tangent plane
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                                type="checkbox"
                                checked={state.showNormal3D}
                                onChange={(event) =>
                                    onStateChange((prev) => ({ ...prev, showNormal3D: event.target.checked }))
                                }
                            />
                            Normal vector
                        </label>
                    </div>

                    <div className="presets">
                        <label>Camera Preset</label>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {CAMERA_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                        onStateChange((prev) => ({ ...prev, cameraPreset3D: preset.id }))
                                    }
                                    style={{
                                        padding: "0.28rem 0.72rem",
                                        borderRadius: "999px",
                                        border: "1px solid rgba(148, 163, 184, 0.35)",
                                        background:
                                            state.cameraPreset3D === preset.id
                                                ? "rgba(14,165,233,0.28)"
                                                : "rgba(15,23,42,0.55)",
                                        color:
                                            state.cameraPreset3D === preset.id
                                                ? "#e0f2fe"
                                                : "#cbd5e1"
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {data3D && !data3D.error && (
                        <div className="calculations">
                            <h4>3D Metrics</h4>
                            <div style={{ fontSize: "0.9em", fontFamily: "monospace" }}>
                                <div>f(a,b) = {data3D.z0.toFixed(4)}</div>
                                <div>fx(a,b) = {data3D.dfx.toFixed(4)}</div>
                                <div>fy(a,b) = {data3D.dfy.toFixed(4)}</div>
                                <div>gradient source: {data3D.source}</div>
                            </div>
                        </div>
                    )}
                    {data3D?.error && (
                        <div className="calculations" style={{ color: "#fca5a5" }}>
                            {data3D.error}
                        </div>
                    )}
                </>
            )}

            <button
                type="button"
                onClick={onReset}
                style={{
                    width: "100%",
                    padding: "0.5rem",
                    background: "#64748b",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer"
                }}
            >
                Reset Studio
            </button>
        </div>
    );
}
