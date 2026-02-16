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
  onToggleAllRectangles,
  onToggleAnimateSurface
}) {
  const presetEntries = Object.entries(presets || {});

  return (
    <div className="topology-controls">
      <div className="topology-controls-row">
        <label htmlFor="topology-preset-select">Preset Curve</label>
        <select
          id="topology-preset-select"
          value={state.curveType}
          onChange={(event) => onPresetChange(event.target.value)}
        >
          {presetEntries.map(([id, preset]) => (
            <option key={id} value={id}>
              {preset.name}
            </option>
          ))}
          <option value="custom">Custom Drawn Curve</option>
        </select>
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
        <label>
          <input
            type="checkbox"
            checked={state.animateSurface}
            onChange={(event) => onToggleAnimateSurface(event.target.checked)}
          />
          Auto-rotate 3D surface
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

