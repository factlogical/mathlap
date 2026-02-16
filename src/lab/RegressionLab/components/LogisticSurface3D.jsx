import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SafePlot from "../../../components/SafePlot";

const GRID_STEPS_IDLE = 28;
const GRID_STEPS_PERF = 24;
const MAX_POINT_CLOUD = 220;
const MAX_POINT_CLOUD_PERF = 140;
const SNAPSHOT_INTERVAL_IDLE_MS = 260;
const SNAPSHOT_INTERVAL_TRAINING_MS = 420;
const SNAPSHOT_INTERVAL_PERF_IDLE_MS = 380;
const SNAPSHOT_INTERVAL_PERF_TRAINING_MS = 700;
const INTERACTION_COOLDOWN_MS = 420;
const DEFAULT_CAMERA = {
  eye: { x: 1.45, y: 1.38, z: 1.1 }
};

function linspace(min, max, steps) {
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    out.push(min + ((max - min) * i) / Math.max(1, steps - 1));
  }
  return out;
}

export default function LogisticSurface3D({
  enabled,
  model,
  points = [],
  isTraining = false,
  performanceMode = false
}) {
  const [snapshotTick, setSnapshotTick] = useState(0);
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimerRef = useRef(null);

  const markInteraction = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimerRef.current) {
      window.clearTimeout(interactionTimerRef.current);
    }
    interactionTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false);
    }, INTERACTION_COOLDOWN_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || isInteracting) return undefined;
    const intervalMs = performanceMode
      ? isTraining
        ? SNAPSHOT_INTERVAL_PERF_TRAINING_MS
        : SNAPSHOT_INTERVAL_PERF_IDLE_MS
      : isTraining
        ? SNAPSHOT_INTERVAL_TRAINING_MS
        : SNAPSHOT_INTERVAL_IDLE_MS;
    const timer = window.setInterval(() => {
      setSnapshotTick((value) => value + 1);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, isInteracting, isTraining, performanceMode]);

  const surface = useMemo(() => {
    if (!enabled || !model || typeof model.predict !== "function") return null;
    // Consume snapshotTick so mutated model weights trigger recalculation.
    const tick = snapshotTick;
    void tick;
    const gridSteps = performanceMode ? GRID_STEPS_PERF : GRID_STEPS_IDLE;
    const xs = linspace(-5, 5, gridSteps);
    const ys = linspace(-5, 5, gridSteps);
    const z = xs.map((x) => ys.map((y) => model.predict(x, y)));
    return { xs, ys, z };
  }, [enabled, model, performanceMode, snapshotTick]);

  const cloud = useMemo(() => {
    if (!enabled || !Array.isArray(points) || points.length === 0) return null;
    const maxCloud = performanceMode ? MAX_POINT_CLOUD_PERF : MAX_POINT_CLOUD;
    const step = Math.max(1, Math.floor(points.length / maxCloud));
    const sampled = points.filter((_, index) => index % step === 0).slice(0, maxCloud);
    return {
      x: sampled.map((point) => point.x),
      y: sampled.map((point) => point.y),
      z: sampled.map((point) => (point.label === 1 ? 1 : 0)),
      color: sampled.map((point) => (point.label === 1 ? "#22d3ee" : "#fb7185"))
    };
  }, [enabled, performanceMode, points]);

  const handleRelayout = useCallback(
    (eventData) => {
      if (!eventData || typeof eventData !== "object") return;
      if (eventData["scene.camera"]) {
        setCamera(eventData["scene.camera"]);
        markInteraction();
      }
    },
    [markInteraction]
  );

  if (!enabled) {
    return (
      <section className="reglab-panel reglab-log-surface disabled">
        <div className="reglab-surface-head">
          <strong>سطح القرار اللوجستي ثلاثي الأبعاد</strong>
        </div>
        <p>متاح في وضع اللوجستي فقط.</p>
      </section>
    );
  }

  if (!surface) {
    return (
      <section className="reglab-panel reglab-log-surface disabled">
        <div className="reglab-surface-head">
          <strong>سطح القرار اللوجستي ثلاثي الأبعاد</strong>
        </div>
        <p>تعذر توليد سطح النموذج.</p>
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
      name: "احتمال الفئة p(y=1|x,y)"
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
      name: "البيانات"
    });
  }

  return (
    <section className="reglab-panel reglab-log-surface">
      <div className="reglab-surface-head">
        <strong>سطح القرار اللوجستي ثلاثي الأبعاد</strong>
        <span>z = احتمال الفئة p(y=1|x,y)</span>
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
              camera,
              xaxis: { title: "x", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" },
              yaxis: { title: "y", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" },
              zaxis: {
                title: "الاحتمال",
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
            doubleClick: false,
            modeBarButtonsToAdd: ["zoom3d", "pan3d", "resetCameraDefault3d"]
          }}
          onRelayout={handleRelayout}
          onRelayouting={handleRelayout}
          onInitialized={(figure) => {
            const cam = figure?.layout?.scene?.camera;
            if (cam) setCamera(cam);
          }}
          onUpdate={(figure) => {
            const cam = figure?.layout?.scene?.camera;
            if (cam) setCamera(cam);
          }}
        />
      </div>
    </section>
  );
}
