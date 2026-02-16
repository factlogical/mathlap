import React from "react";

export default function CurveControls({
  state,
  presets,
  stats,
  onPresetChange,
  onToggleDrawing,
  onClearCurve,
  onResolutionChange,
  onToggleIntersections,
  onToggleAllRectangles
}) {
  const presetCards = Object.entries(presets || {}).map(([id, preset]) => ({
    id,
    name: preset.name || id,
    description: preset.description || ""
  }));
  presetCards.push({
    id: "custom",
    name: "رسم حر",
    description: "ارسم منحنى مخصص بالماوس داخل نافذة 2D."
  });

  return (
    <div className="topology-controls">
      <div className="topology-controls-row">
        <label>Preset Curves</label>
        <div className="topology-presets-grid">
          {presetCards.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`topology-preset-card ${state.curveType === preset.id ? "active" : ""}`}
              onClick={() => onPresetChange(preset.id)}
            >
              <strong>{preset.name}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="topology-controls-row topology-controls-buttons">
        <button type="button" onClick={onToggleDrawing} className={state.isDrawingMode ? "active" : ""}>
          {state.isDrawingMode ? "Finish Drawing" : "Draw Curve"}
        </button>
        <button type="button" onClick={onClearCurve}>
          Clear
        </button>
      </div>

      <div className="topology-controls-row">
        <label htmlFor="topology-resolution-range">Surface Resolution: {state.resolution}</label>
        <input
          id="topology-resolution-range"
          type="range"
          min="20"
          max="100"
          step="2"
          value={state.resolution}
          onChange={(event) => onResolutionChange(Number(event.target.value))}
        />
      </div>

      <div className="topology-controls-toggles">
        <label>
          <input
            type="checkbox"
            checked={state.showIntersections}
            onChange={(event) => onToggleIntersections(event.target.checked)}
          />
          Show collision points
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.showAllRectangles}
            onChange={(event) => onToggleAllRectangles(event.target.checked)}
          />
          Show all rectangles in 2D
        </label>
      </div>

      <div className="topology-stats">
        <h4>Stats</h4>
        <div>Curve points: {stats.curvePointsCount}</div>
        <div>Topology points: {stats.surfacePointsCount}</div>
        <div>Detected rectangles: {stats.rectanglesCount}</div>
      </div>
    </div>
  );
}
