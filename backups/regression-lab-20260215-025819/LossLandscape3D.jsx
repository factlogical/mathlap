import { memo, useCallback, useEffect, useMemo, useState } from "react";
import SafePlot from "../../../components/SafePlot";

const SURFACE_CAP = 25;
const SURFACE_STEPS = 34;
const SNAPSHOT_INTERVAL_MS = 220;

function computeMSE(points, w, b) {
  if (!Array.isArray(points) || points.length === 0) return 0;
  let sum = 0;
  for (const point of points) {
    const error = w * point.x + b - point.y;
    sum += error * error;
  }
  return sum / points.length;
}

function estimateLinearSolution(points) {
  if (!Array.isArray(points) || points.length < 2) return { w: 0, b: 0 };
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXX += point.x * point.x;
    sumXY += point.x * point.y;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-8) return { w: 0, b: sumY / n };
  const w = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - w * sumX) / n;
  return { w, b };
}

function LossLandscape3D({ enabled, points, model, testPoints = [] }) {
  const surfaceData = useMemo(() => {
    if (!enabled || !Array.isArray(points) || points.length < 2) return null;

    const best = estimateLinearSolution(points);
    const currentW = Number.isFinite(model?.w) ? model.w : 0;
    const currentB = Number.isFinite(model?.b) ? model.b : 0;

    const centerW = Number.isFinite(best.w) ? best.w : currentW;
    const centerB = Number.isFinite(best.b) ? best.b : currentB;
    const wSpan = Math.max(1.6, Math.abs(centerW) * 1.4 + 1.2);
    const bSpan = Math.max(1.6, Math.abs(centerB) * 1.4 + 1.2);

    const ws = [];
    const bs = [];
    const z = [];

    for (let i = 0; i < SURFACE_STEPS; i += 1) {
      const w = centerW - wSpan + (2 * wSpan * i) / (SURFACE_STEPS - 1);
      ws.push(w);
    }
    for (let j = 0; j < SURFACE_STEPS; j += 1) {
      const b = centerB - bSpan + (2 * bSpan * j) / (SURFACE_STEPS - 1);
      bs.push(b);
    }

    for (let i = 0; i < ws.length; i += 1) {
      const row = [];
      for (let j = 0; j < bs.length; j += 1) {
        const mse = computeMSE(points, ws[i], bs[j]);
        row.push(Math.min(mse, SURFACE_CAP));
      }
      z.push(row);
    }

    const bestLoss = computeMSE(points, best.w, best.b);

    return {
      ws,
      bs,
      z,
      bestW: best.w,
      bestB: best.b,
      bestLoss
    };
  }, [enabled, points]);

  const computeSnapshot = useCallback(() => {
    const currentW = Number.isFinite(model?.w) ? model.w : 0;
    const currentB = Number.isFinite(model?.b) ? model.b : 0;
    const train = Array.isArray(points) && points.length ? computeMSE(points, currentW, currentB) : null;
    const test =
      Array.isArray(testPoints) && testPoints.length ? computeMSE(testPoints, currentW, currentB) : null;
    return {
      currentW,
      currentB,
      currentLossValue: Number.isFinite(train) ? train : null,
      testLossValue: Number.isFinite(test) ? test : null
    };
  }, [model, points, testPoints]);

  const [snapshot, setSnapshot] = useState(() => computeSnapshot());

  useEffect(() => {
    setSnapshot(computeSnapshot());
  }, [computeSnapshot]);

  useEffect(() => {
    if (!enabled || !surfaceData) return undefined;
    const updateSnapshot = () => {
      const next = computeSnapshot();
      setSnapshot((prev) => {
        if (!prev) return next;
        const sameW = Math.abs((prev.currentW ?? 0) - (next.currentW ?? 0)) < 1e-4;
        const sameB = Math.abs((prev.currentB ?? 0) - (next.currentB ?? 0)) < 1e-4;
        const sameTrain = Math.abs((prev.currentLossValue ?? 0) - (next.currentLossValue ?? 0)) < 1e-4;
        const sameTest = Math.abs((prev.testLossValue ?? 0) - (next.testLossValue ?? 0)) < 1e-4;
        return sameW && sameB && sameTrain && sameTest ? prev : next;
      });
    };
    updateSnapshot();
    const timer = window.setInterval(updateSnapshot, SNAPSHOT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [computeSnapshot, enabled, surfaceData]);

  const traces = useMemo(() => {
    if (!surfaceData) return [];
    return [
      {
        type: "surface",
        x: surfaceData.ws,
        y: surfaceData.bs,
        z: surfaceData.z,
        opacity: 0.85,
        showscale: false,
        colorscale: [
          [0, "#1e3a8a"],
          [0.55, "#0ea5e9"],
          [1, "#22d3ee"]
        ]
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: [snapshot.currentW],
        y: [snapshot.currentB],
        z: [snapshot.currentLossValue ?? 0],
        marker: {
          size: 5,
          color: "#ef4444"
        },
        name: "Current"
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: [surfaceData.bestW],
        y: [surfaceData.bestB],
        z: [surfaceData.bestLoss],
        marker: {
          size: 5,
          color: "#10b981"
        },
        name: "Best"
      }
    ];
  }, [snapshot.currentB, snapshot.currentLossValue, snapshot.currentW, surfaceData]);

  const layout = useMemo(
    () => ({
      uirevision: "reglab-loss-landscape-ui",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 0, r: 0, t: 0, b: 0 },
      scene: {
        uirevision: "reglab-loss-landscape-ui",
        bgcolor: "rgba(7,17,34,0.65)",
        dragmode: "orbit",
        camera: {
          eye: { x: 1.5, y: 1.4, z: 1.2 }
        },
        xaxis: { title: "w", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" },
        yaxis: { title: "b", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" },
        zaxis: { title: "loss", color: "#a7b9e2", gridcolor: "rgba(95,114,153,0.35)" }
      },
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0,
        y: 1,
        font: { color: "#dbe8ff", size: 10 },
        bgcolor: "rgba(0,0,0,0)"
      }
    }),
    []
  );

  if (!enabled) {
    return (
      <section className="reglab-panel reglab-landscape disabled">
        <div className="reglab-landscape-head">
          <strong>Loss Landscape 3D</strong>
        </div>
        <p>Available in Linear mode only.</p>
      </section>
    );
  }

  if (!surfaceData) {
    return (
      <section className="reglab-panel reglab-landscape disabled">
        <div className="reglab-landscape-head">
          <strong>Loss Landscape 3D</strong>
        </div>
        <p>Add at least two points to generate the surface.</p>
      </section>
    );
  }

  return (
    <section className="reglab-panel reglab-landscape">
      <div className="reglab-landscape-head">
        <strong>Loss Landscape 3D</strong>
        <span>
          Train {Number.isFinite(snapshot.currentLossValue) ? snapshot.currentLossValue.toFixed(4) : "--"}
          {Number.isFinite(snapshot.testLossValue) ? ` | Test ${snapshot.testLossValue.toFixed(4)}` : ""}
        </span>
      </div>
      <div className="reglab-landscape-plot">
        <SafePlot
          data={traces}
          layout={layout}
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

function arePropsEqual(prev, next) {
  return (
    prev.enabled === next.enabled &&
    prev.points === next.points &&
    prev.model === next.model &&
    prev.testPoints === next.testPoints
  );
}

export default memo(LossLandscape3D, arePropsEqual);
