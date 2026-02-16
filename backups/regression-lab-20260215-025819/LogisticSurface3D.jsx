import { useEffect, useMemo, useState } from "react";
import SafePlot from "../../../components/SafePlot";

const GRID_STEPS = 28;
const MAX_POINT_CLOUD = 220;
const SNAPSHOT_INTERVAL_MS = 260;

function linspace(min, max, steps) {
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    out.push(min + ((max - min) * i) / Math.max(1, steps - 1));
  }
  return out;
}

export default function LogisticSurface3D({ enabled, model, points = [] }) {
  const [snapshotTick, setSnapshotTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => {
      setSnapshotTick((value) => value + 1);
    }, SNAPSHOT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const surface = useMemo(() => {
    if (!enabled || !model || typeof model.predict !== "function") return null;
    const xs = linspace(-5, 5, GRID_STEPS);
    const ys = linspace(-5, 5, GRID_STEPS);
    const z = xs.map((x) => ys.map((y) => model.predict(x, y)));
    return { xs, ys, z };
  }, [enabled, model, snapshotTick]);

  const cloud = useMemo(() => {
    if (!enabled || !Array.isArray(points) || points.length === 0) return null;
    const step = Math.max(1, Math.floor(points.length / MAX_POINT_CLOUD));
    const sampled = points.filter((_, index) => index % step === 0).slice(0, MAX_POINT_CLOUD);
    return {
      x: sampled.map((point) => point.x),
      y: sampled.map((point) => point.y),
      z: sampled.map((point) => (point.label === 1 ? 1 : 0)),
      color: sampled.map((point) => (point.label === 1 ? "#22d3ee" : "#fb7185"))
    };
  }, [enabled, points]);

  if (!enabled) {
    return (
      <section className="reglab-panel reglab-log-surface disabled">
        <div className="reglab-surface-head">
          <strong>Logistic Decision Surface 3D</strong>
        </div>
        <p>Available in Logistic mode only.</p>
      </section>
    );
  }

  if (!surface) {
    return (
      <section className="reglab-panel reglab-log-surface disabled">
        <div className="reglab-surface-head">
          <strong>Logistic Decision Surface 3D</strong>
        </div>
        <p>Model surface unavailable.</p>
      </section>
    );
  }

  const traces = [
    {
      type: "surface",
      x: surface.xs,
      y: surface.ys,
      z: surface.z,
      opacity: 0.88,
      showscale: false,
      colorscale: [
        [0, "#7f1d1d"],
        [0.5, "#1e293b"],
        [1, "#0e7490"]
      ],
      name: "p(y=1|x,y)"
    }
  ];

  if (cloud) {
    traces.push({
      type: "scatter3d",
      mode: "markers",
      x: cloud.x,
      y: cloud.y,
      z: cloud.z,
      marker: {
        size: 3,
        color: cloud.color,
        opacity: 0.92
      },
      name: "Data"
    });
  }

  return (
    <section className="reglab-panel reglab-log-surface">
      <div className="reglab-surface-head">
        <strong>Logistic Decision Surface 3D</strong>
        <span>z = p(y=1|x,y)</span>
      </div>
      <div className="reglab-surface-plot">
        <SafePlot
          data={traces}
          layout={{
            uirevision: "reglab-log-surface-ui",
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            margin: { l: 0, r: 0, t: 0, b: 0 },
            showlegend: true,
            legend: {
              orientation: "h",
              x: 0,
              y: 1,
              font: { color: "#dbe8ff", size: 10 },
              bgcolor: "rgba(0,0,0,0)"
            },
            scene: {
              uirevision: "reglab-log-surface-ui",
              bgcolor: "rgba(7,17,34,0.65)",
              dragmode: "orbit",
              camera: {
                eye: { x: 1.45, y: 1.38, z: 1.1 }
              },
              xaxis: { title: "x", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" },
              yaxis: { title: "y", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" },
              zaxis: {
                title: "probability",
                color: "#a7b9e2",
                gridcolor: "rgba(95,114,153,0.35)",
                range: [0, 1]
              }
            }
          }}
          config={{
            responsive: true,
            displaylogo: false,
            scrollZoom: true,
            modeBarButtonsToAdd: ["zoom3d", "pan3d", "resetCameraDefault3d"]
          }}
        />
      </div>
    </section>
  );
}
