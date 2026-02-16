import SafePlot from "../components/SafePlot";
import { useMemo, useState, useEffect } from "react";
import { compile } from "mathjs";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";
import { Settings, Info, ZoomIn, ZoomOut, Move } from "lucide-react";

function linspace(min, max, n) {
  const arr = [];
  const step = (max - min) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(min + step * i);
  return arr;
}

export default function Derivative2DRenderer({ spec }) {
  // --- 1. State ---
  const [xRange, setXRange] = useState(spec.params?.xRange || [-5, 5]);
  const [currentX, setCurrentX] = useState(spec.payload?.x_point ?? 1);
  const [resolution] = useState(300);

  // Update state if spec changes
  useEffect(() => {
    if (spec.params?.xRange) setXRange(spec.params.xRange);
    if (spec.payload?.x_point !== undefined) setCurrentX(spec.payload.x_point);
  }, [spec]);

  // --- 2. Math Logic ---
  const equationRaw = spec.payload?.expr || "x^2"; // Default fallback

  const { curveData, tangentData, latexEquation, error } = useMemo(() => {
    let err = null;
    let curveXs = [], curveYs = [];
    let tangentXs = [], tangentYs = [];
    let latex = "";
    let m = 0;
    let y0 = 0;

    try {
      // Setup Function
      const normEq = equationRaw.replace(/\*\*/g, "^");
      const compiled = compile(normEq);

      // LaTeX (Simple heuristic)
      latex = normEq
        .replace(/sin/g, "\\sin")
        .replace(/cos/g, "\\cos")
        .replace(/tan/g, "\\tan")
        .replace(/sqrt/g, "\\sqrt")
        .replace(/pi/g, "\\pi")
        .replace(/\*/g, " \\cdot ");

      // 1. Calculate Curve
      curveXs = linspace(xRange[0], xRange[1], resolution);
      curveYs = curveXs.map(x => {
        try { return compiled.evaluate({ x }); } catch { return NaN; }
      });

      // 2. Calculate Tangent at currentX
      // Numerical Derivative: (f(x+h) - f(x-h)) / 2h
      const h = 0.0001;
      const f_x = compiled.evaluate({ x: currentX });
      const f_x_plus_h = compiled.evaluate({ x: currentX + h });
      const f_x_minus_h = compiled.evaluate({ x: currentX - h });

      y0 = f_x;
      m = (f_x_plus_h - f_x_minus_h) / (2 * h);

      // Tangent Equation: y = m(x - x0) + y0
      tangentXs = [xRange[0], xRange[1]];
      tangentYs = tangentXs.map(x => m * (x - currentX) + y0);

    } catch (e) {
      err = "Math Error: " + e.message;
    }

    return {
      curveData: { x: curveXs, y: curveYs },
      tangentData: { x: tangentXs, y: tangentYs, m, y0 },
      latexEquation: latex,
      error: err
    };
  }, [equationRaw, xRange, currentX, resolution]);

  // Handlers
  const handleZoomIn = () => setXRange([xRange[0] * 0.8, xRange[1] * 0.8]);
  const handleZoomOut = () => setXRange([xRange[0] * 1.25, xRange[1] * 1.25]);

  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
          {spec.title || "Derivative Visualizer"}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white transition" title="Zoom Out">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button onClick={handleZoomIn} className="p-2 rounded hover:bg-white/10 text-gray-400 hover:text-white transition" title="Zoom In">
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-4 flex items-center gap-3">
          <Info className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Plot */}
      <div className="flex-1 min-h-[300px] bg-[#0b1020] rounded-xl border border-white/5 overflow-hidden relative shadow-inner">
        <SafePlot
          data={[
            // Main Function Curve
            {
              type: "scatter", mode: "lines",
              x: curveData.x, y: curveData.y,
              name: "f(x)",
              line: { color: "#60a5fa", width: 3 }
            },
            // Tangent Line
            {
              type: "scatter", mode: "lines",
              x: tangentData.x, y: tangentData.y,
              name: "Tangent",
              line: { color: "#f97316", width: 2, dash: "dash" } // Orange dashed
            },
            // Point Marker
            {
              type: "scatter", mode: "markers",
              x: [currentX], y: [tangentData.y0],
              name: "P",
              marker: { color: "#f97316", size: 12, line: { color: "white", width: 2 } }
            }
          ]}
          layout={{
            autosize: true,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "#94a3b8" },
            margin: { l: 40, r: 20, t: 20, b: 40 },
            xaxis: { gridcolor: "#1e293b", zerolinecolor: "#475569", range: xRange },
            yaxis: { gridcolor: "#1e293b", zerolinecolor: "#475569" },
            showlegend: true,
            legend: { x: 0, y: 1, font: { size: 10 }, bgcolor: 'rgba(0,0,0,0)' }
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: false }}
        />

        {/* Floating Equation Label */}
        {!error && (
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg text-lg shadow-xl pointer-events-none text-right">
            <div className="text-blue-300"><InlineMath math={`f(x) = ${latexEquation}`} /></div>
            <div className="text-orange-400 text-sm mt-1">
              <InlineMath math={`f'(${currentX.toFixed(2)}) \\approx ${tangentData.m.toFixed(2)}`} />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
          <Move className="w-4 h-4" />
          Tangent Control
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Tangent Point (x₀)</span>
              <span className="text-orange-400 font-mono">{currentX.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={xRange[0]} max={xRange[1]} step="0.05"
              value={currentX}
              onChange={(e) => setCurrentX(Number(e.target.value))}
              className="w-full accent-orange-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="w-px h-10 bg-white/10 mx-2"></div>

          <div className="text-xs text-gray-400 min-w-[120px]">
            <div>Slope: <span className="text-white">{tangentData.m.toFixed(3)}</span></div>
            <div>Y-Val: <span className="text-white">{tangentData.y0.toFixed(3)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
