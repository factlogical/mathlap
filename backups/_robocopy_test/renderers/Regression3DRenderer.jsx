import SafePlot from "../components/SafePlot";
import { useMemo, useState } from "react";
import { fitPlane } from "../math/fitPlane.js";

function linspace(min, max, n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(min + (max - min) * i / (n - 1));
  return arr;
}

export default function Regression3DRenderer({ spec }) {
  const initialPoints = spec.params.points;
  const [points, setPoints] = useState(initialPoints);

  // λ من spec لو موجود، وإلا 0
  const defaultLambda = spec.controls?.find(c => c.name === "lambda")?.default ?? 0;
  const [lambda, setLambda] = useState(defaultLambda);

  const { a, b, c } = useMemo(() => {
    const fitted = fitPlane(points);
    const shrink = 1 / (1 + lambda); // تبسيط بصري لفكرة التنظيم
    return { a: fitted.a * shrink, b: fitted.b * shrink, c: fitted.c };
  }, [points, lambda]);

  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const zs = points.map(p => p[2]);

  const gridX = linspace(spec.params.xRange[0], spec.params.xRange[1], 20);
  const gridY = linspace(spec.params.yRange[0], spec.params.yRange[1], 20);
  const Z = gridY.map((y) => gridX.map((x) => a * x + b * y + c));

  function addRandomPoint() {
    const x = Math.random() * 4 - 2;
    const y = Math.random() * 4 - 2;
    const noise = Math.random() * 0.6 - 0.3;
    const z = a * x + b * y + c + noise;
    setPoints(prev => [...prev, [x, y, z]]);
  }

  function reset() {
    setPoints(initialPoints);
    setLambda(defaultLambda);
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Regression3DRenderer (Fitted Plane)</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>λ</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={lambda}
            onChange={(e) => setLambda(Number(e.target.value))}
          />
          <b>{lambda.toFixed(1)}</b>
        </label>

        <button onClick={addRandomPoint}>Add random point</button>
        <button onClick={reset}>Reset</button>

        <small style={{ marginLeft: "auto" }}>
          z = <b>{a.toFixed(2)}</b>x + <b>{b.toFixed(2)}</b>y + <b>{c.toFixed(2)}</b>
        </small>
      </div>

      <SafePlot
        data={[
          { type: "scatter3d", mode: "markers", x: xs, y: ys, z: zs, marker: { size: 4 }, name: "Points" },
          { type: "surface", x: gridX, y: gridY, z: Z, opacity: 0.6, showscale: false, name: "Plane" },
        ]}
        layout={{
          autosize: true,
          height: 520,
          margin: { l: 0, r: 0, t: 30, b: 0 },
          title: spec.title,
          scene: { xaxis: { title: "x" }, yaxis: { title: "y" }, zaxis: { title: "z" } },
        }}
        style={{ width: "100%" }}
        useResizeHandler={true}
        config={{ responsive: true }}
      />
    </div>
  );
}
