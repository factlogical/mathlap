import React, { useEffect, useMemo, useState } from "react";
import SafePlot from "../../../components/SafePlot";

function resolveHighlight(highlighted, collisions) {
  if (Number.isInteger(highlighted) && highlighted >= 0 && highlighted < collisions.length) {
    return collisions[highlighted] || null;
  }
  if (
    highlighted &&
    Number.isFinite(highlighted.x) &&
    Number.isFinite(highlighted.y) &&
    Number.isFinite(highlighted.z)
  ) {
    return highlighted;
  }
  return null;
}

function resolveCamera(camera) {
  if (!camera || typeof camera !== "object") return null;
  const eye = camera.eye && typeof camera.eye === "object" ? camera.eye : {};
  const up = camera.up && typeof camera.up === "object" ? camera.up : {};
  const center = camera.center && typeof camera.center === "object" ? camera.center : {};

  const ex = Number(eye.x);
  const ey = Number(eye.y);
  const ez = Number(eye.z);
  if (![ex, ey, ez].every(Number.isFinite)) return null;

  return {
    eye: { x: ex, y: ey, z: ez },
    up: {
      x: Number.isFinite(Number(up.x)) ? Number(up.x) : 0,
      y: Number.isFinite(Number(up.y)) ? Number(up.y) : 0,
      z: Number.isFinite(Number(up.z)) ? Number(up.z) : 1
    },
    center: {
      x: Number.isFinite(Number(center.x)) ? Number(center.x) : 0,
      y: Number.isFinite(Number(center.y)) ? Number(center.y) : 0,
      z: Number.isFinite(Number(center.z)) ? Number(center.z) : 0
    },
    projection: { type: "perspective" }
  };
}

export default function SurfaceView3D({
  surface,
  collisions = [],
  highlighted = null,
  showIntersections = true,
  tutorialCamera = null,
  tutorialAutoRotate = false,
  onSelectCollision
}) {
  const [spinAngle, setSpinAngle] = useState(0);
  const activeHighlight = useMemo(
    () => resolveHighlight(highlighted, collisions),
    [highlighted, collisions]
  );
  const baseTutorialCamera = useMemo(() => resolveCamera(tutorialCamera), [tutorialCamera]);

  useEffect(() => {
    if (!tutorialAutoRotate) {
      setSpinAngle(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setSpinAngle((prev) => (prev + 0.04) % (Math.PI * 2));
    }, 40);
    return () => window.clearInterval(timer);
  }, [tutorialAutoRotate]);

  const resolvedCamera = useMemo(() => {
    const fallback = {
      center: { x: 0, y: 0, z: 0 },
      eye: { x: 1.18, y: -1.02, z: 0.9 },
      up: { x: 0, y: 0, z: 1 },
      projection: { type: "perspective" }
    };
    const base = baseTutorialCamera || fallback;
    if (!tutorialAutoRotate) return base;
    const radius = Math.max(1.2, Math.hypot(base.eye.x, base.eye.y));
    return {
      ...base,
      eye: {
        x: radius * Math.cos(spinAngle),
        y: radius * Math.sin(spinAngle),
        z: base.eye.z
      }
    };
  }, [baseTutorialCamera, spinAngle, tutorialAutoRotate]);

  const traces = useMemo(() => {
    const data = [];
    if (Array.isArray(surface?.grid) && surface.grid.length > 0) {
      data.push({
        type: "surface",
        x: surface.xAxis,
        y: surface.yAxis,
        z: surface.grid,
        colorscale: [
          [0, "#1e3a8a"],
          [0.5, "#3b82f6"],
          [1, "#06b6d4"]
        ],
        opacity: 0.91,
        showscale: false,
        contours: {
          z: {
            show: true,
            usecolormap: false,
            highlightcolor: "rgba(148, 163, 184, 0.35)",
            project: { z: false }
          }
        },
        hovertemplate: "Midpoint=(%{x:.2f}, %{y:.2f})<br>Distance=%{z:.2f}<extra></extra>",
        name: "Topology surface"
      });
    }

    if (showIntersections && Array.isArray(collisions) && collisions.length > 0) {
      data.push({
        type: "scatter3d",
        mode: "markers",
        name: "Collisions",
        x: collisions.map((p) => p.x),
        y: collisions.map((p) => p.y),
        z: collisions.map((p) => p.z),
        customdata: collisions.map((_, i) => i),
        marker: {
          size: 5.2,
          color: "#f59e0b",
          line: { width: 0.5, color: "rgba(15, 23, 42, 0.9)" }
        },
        hovertemplate: "Collision %{customdata}<br>(%{x:.2f}, %{y:.2f}, %{z:.2f})<extra></extra>"
      });
    }

    if (activeHighlight) {
      data.push({
        type: "scatter3d",
        mode: "markers",
        name: "Selected",
        x: [activeHighlight.x],
        y: [activeHighlight.y],
        z: [activeHighlight.z],
        marker: {
          size: 9.5,
          color: "#fbbf24",
          line: { width: 1.2, color: "#fef3c7" }
        },
        hovertemplate: "Selected collision<br>(%{x:.2f}, %{y:.2f}, %{z:.2f})<extra></extra>"
      });
    }

    return data;
  }, [activeHighlight, collisions, showIntersections, surface]);

  const layout = useMemo(() => {
    const hasRanges =
      Array.isArray(surface?.xRange) &&
      surface.xRange.length === 2 &&
      Array.isArray(surface?.yRange) &&
      surface.yRange.length === 2;
    const xSpan = hasRanges ? Math.max(1e-6, surface.xRange[1] - surface.xRange[0]) : 2;
    const ySpan = hasRanges ? Math.max(1e-6, surface.yRange[1] - surface.yRange[0]) : 2;
    const xPad = xSpan * 0.04;
    const yPad = ySpan * 0.04;
    const zMax = Number.isFinite(surface?.maxDistance) ? Math.max(0.8, surface.maxDistance * 1.05) : 4.5;

    return {
      autosize: true,
      margin: { l: 2, r: 2, b: 2, t: 2 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      showlegend: false,
      hovermode: false,
      uirevision: "topology-stable-3d-camera",
      scene: {
        bgcolor: "rgba(0,0,0,0)",
        aspectmode: "data",
        dragmode: "orbit",
        camera: resolvedCamera,
        xaxis: {
          title: "Mx",
          range: hasRanges ? [surface.xRange[0] - xPad, surface.xRange[1] + xPad] : undefined,
          showbackground: false,
          color: "#94a3b8",
          gridcolor: "rgba(148,163,184,0.14)",
          zerolinecolor: "rgba(148,163,184,0.16)"
        },
        yaxis: {
          title: "My",
          range: hasRanges ? [surface.yRange[0] - yPad, surface.yRange[1] + yPad] : undefined,
          showbackground: false,
          color: "#94a3b8",
          gridcolor: "rgba(148,163,184,0.14)",
          zerolinecolor: "rgba(148,163,184,0.16)"
        },
        zaxis: {
          title: "D",
          range: [0, zMax],
          showbackground: false,
          color: "#94a3b8",
          gridcolor: "rgba(148,163,184,0.14)",
          zerolinecolor: "rgba(148,163,184,0.16)"
        }
      }
    };
  }, [resolvedCamera, surface]);

  const handleClick = (event) => {
    if (typeof onSelectCollision !== "function") return;
    const point = event?.points?.[0];
    if (!point) return;
    const index = Number(point.customdata);
    if (Number.isInteger(index)) {
      onSelectCollision(index);
    }
  };

  return (
    <div className="topology-surface-wrap">
      <SafePlot
        data={traces}
        layout={layout}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
        config={{
          displayModeBar: true,
          modeBarButtonsToAdd: ["zoom3d", "pan3d", "resetCameraDefault3d"],
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          displaylogo: false,
          responsive: true,
          scrollZoom: true,
          doubleClick: "reset+autosize"
        }}
        onClick={handleClick}
      />
      {(!surface?.grid || surface.grid.length === 0) && (
        <div className="topology-surface-empty">
          Add or draw a closed curve to build the 3D topology surface.
        </div>
      )}
    </div>
  );
}
