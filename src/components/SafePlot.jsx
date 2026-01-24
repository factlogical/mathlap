import React from "react";
import Plot from "react-plotly.js";

/**
 * SafePlot
 * Wrapper around react-plotly.js with safe defaults.
 * - Ensures arrays/objects exist
 * - Avoids passing undefined layout subtrees that some Plotly versions choke on
 */
export default function SafePlot({
  data = [],
  layout = {},
  config = {},
  style = {},
  className = "",
  useResizeHandler = true,
  divId,
}) {
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];

  // Ensure layout is an object
  const baseLayout =
    layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {};

  // Force-safe arrays (Plotly sometimes assumes these exist)
  const safeLayout = {
    ...baseLayout,
    annotations: Array.isArray(baseLayout.annotations) ? baseLayout.annotations : [],
    shapes: Array.isArray(baseLayout.shapes) ? baseLayout.shapes : [],
    images: Array.isArray(baseLayout.images) ? baseLayout.images : [],
  };

  // Safe config object
  const safeConfig =
    config && typeof config === "object" && !Array.isArray(config) ? config : {};

  return (
    <Plot
      divId={divId}
      data={safeData}
      layout={safeLayout}
      config={safeConfig}
      useResizeHandler={useResizeHandler}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
