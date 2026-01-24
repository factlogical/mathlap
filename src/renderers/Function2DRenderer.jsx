import SafePlot from "../components/SafePlot";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { compile } from "mathjs";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";
import { ZoomIn, ZoomOut, Home, Move, Crosshair, Sparkles, Loader2 } from "lucide-react";
import { interpretPromptToJson } from "../agent/interpret";

function linspace(min, max, n) {
  const arr = [];
  const step = (max - min) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(min + step * i);
  return arr;
}

export default function Function2DRenderer({ spec, onExpressionChange }) {
  // --- State ---
  const [xRange, setXRange] = useState(spec.params?.xRange || [-10, 10]);
  const [yRange, setYRange] = useState([-10, 10]);
  const [dragMode, setDragMode] = useState("pan");
  const [expression, setExpression] = useState("");

  // AI Suggestion Chips
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const debounceRef = useRef(null);
  const suggestionsDebounceRef = useRef(null);

  // Extract expression from spec
  useEffect(() => {
    const expr = spec.payload?.expr || spec.params?.equation || "";
    setExpression(expr);
    if (spec.params?.xRange) setXRange(spec.params.xRange);

    // Generate AI suggestions for new expression
    if (expr) {
      generateSuggestions(expr);
    }
  }, [spec]);

  // --- Generate AI Suggestions ---
  const generateSuggestions = async (expr) => {
    if (!expr || expr.trim().length < 2) return;

    // Debounce suggestions
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current);
    }

    suggestionsDebounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const prompt = `Given the mathematical function: ${expr}
        
Suggest 3 interesting mathematical variations. Return ONLY a JSON array like this:
[
  { "label": "Add Decay", "expr": "sin(x)*exp(-0.1*x)" },
  { "label": "Double Frequency", "expr": "sin(2*x)" },
  { "label": "Square It", "expr": "(sin(x))^2" }
]

Respond with ONLY the JSON array, no other text.`;

        const result = await interpretPromptToJson(prompt, "math_suggestions");

        if (result && Array.isArray(result)) {
          setSuggestions(result.slice(0, 4));
        } else if (typeof result === 'string') {
          // Try to parse JSON from string
          const match = result.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            setSuggestions(parsed.slice(0, 4));
          }
        }
      } catch (e) {
        console.error("Failed to generate suggestions:", e);
        // Fallback suggestions
        setSuggestions([
          { label: "Dampen", expr: `(${expr})*exp(-0.1*abs(x))` },
          { label: "Shift", expr: expr.replace(/x/g, "(x-2)") },
          { label: "Stretch", expr: `2*(${expr})` }
        ]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);
  };

  // --- Apply Suggestion ---
  const applySuggestion = (newExpr) => {
    setExpression(newExpr);
    if (onExpressionChange) {
      onExpressionChange(newExpr);
    }
    // Generate new suggestions for the new expression
    generateSuggestions(newExpr);
  };

  // --- Calculate Function Data (Infinite Canvas) ---
  const { xs, ys, error, latexEquation } = useMemo(() => {
    const min = xRange[0];
    const max = xRange[1];
    // Add buffer for smooth panning
    const buffer = (max - min) * 0.2;
    const bufferedMin = min - buffer;
    const bufferedMax = max + buffer;

    // Dynamic resolution based on range
    const resolution = Math.max(500, Math.min(2000, Math.ceil((bufferedMax - bufferedMin) * 30)));
    const xs = linspace(bufferedMin, bufferedMax, resolution);
    let ys = [];
    let err = null;
    let latex = expression || "";

    if (expression) {
      try {
        const normEq = expression.replace(/\*\*/g, "^");
        latex = normEq
          .replace(/sin/g, "\\sin")
          .replace(/cos/g, "\\cos")
          .replace(/tan/g, "\\tan")
          .replace(/sqrt/g, "\\sqrt")
          .replace(/exp/g, "\\exp")
          .replace(/abs/g, "|")
          .replace(/pi/g, "\\pi");

        const compiled = compile(normEq);
        ys = xs.map(x => {
          try {
            const res = compiled.evaluate({ x });
            return typeof res === 'number' && isFinite(res) ? res : null;
          } catch { return null; }
        });
      } catch (e) {
        err = "Parse Error: " + e.message;
      }
    }

    return { xs, ys, error: err, latexEquation: latex };
  }, [xRange, expression]);

  // --- Infinite Canvas: Handle Relayout ---
  const handleRelayout = useCallback((event) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const newXRange = event['xaxis.range[0]'] !== undefined
        ? [event['xaxis.range[0]'], event['xaxis.range[1]']]
        : event['xaxis.range'] || null;

      const newYRange = event['yaxis.range[0]'] !== undefined
        ? [event['yaxis.range[0]'], event['yaxis.range[1]']]
        : event['yaxis.range'] || null;

      if (newXRange && newXRange[0] !== undefined) {
        setXRange([newXRange[0], newXRange[1]]);
      }
      if (newYRange && newYRange[0] !== undefined) {
        setYRange([newYRange[0], newYRange[1]]);
      }
    }, 100);
  }, []);

  // --- Control Handlers ---
  const handleZoomIn = () => {
    const cx = (xRange[0] + xRange[1]) / 2;
    const cy = (yRange[0] + yRange[1]) / 2;
    const wx = (xRange[1] - xRange[0]) * 0.4;
    const wy = (yRange[1] - yRange[0]) * 0.4;
    setXRange([cx - wx, cx + wx]);
    setYRange([cy - wy, cy + wy]);
  };

  const handleZoomOut = () => {
    const cx = (xRange[0] + xRange[1]) / 2;
    const cy = (yRange[0] + yRange[1]) / 2;
    const wx = (xRange[1] - xRange[0]) * 1.25;
    const wy = (yRange[1] - yRange[0]) * 1.25;
    setXRange([cx - wx, cx + wx]);
    setYRange([cy - wy, cy + wy]);
  };

  const handleReset = () => {
    setXRange([-10, 10]);
    setYRange([-10, 10]);
  };

  const toggleDragMode = () => {
    setDragMode(dragMode === 'pan' ? 'zoom' : 'pan');
  };

  // --- Plot Data (Cyan Line, No Animation) ---
  const plotData = [
    {
      type: "scatter",
      mode: "lines",
      x: xs,
      y: ys,
      line: {
        color: "#22d3ee", // Cyan
        width: 3
      },
      hovertemplate: '<b>x</b>: %{x:.3f}<br><b>f(x)</b>: %{y:.3f}<extra></extra>'
    }
  ];

  // --- Layout ---
  const plotLayout = {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: '#64748b',
      family: "'JetBrains Mono', 'Consolas', monospace",
      size: 11
    },
    margin: { l: 50, r: 30, t: 30, b: 50 },
    xaxis: {
      range: xRange,
      gridcolor: "rgba(255, 255, 255, 0.05)",
      zerolinecolor: "rgba(255, 255, 255, 0.3)",
      zerolinewidth: 2,
      tickfont: { family: "'JetBrains Mono', monospace" }
    },
    yaxis: {
      range: yRange,
      gridcolor: "rgba(255, 255, 255, 0.05)",
      zerolinecolor: "rgba(255, 255, 255, 0.3)",
      zerolinewidth: 2,
      tickfont: { family: "'JetBrains Mono', monospace" }
    },
    showlegend: false,
    dragmode: dragMode,
    hovermode: 'x unified'
  };

  return (
    <div className="function-2d-container">
      {/* Full Screen Graph */}
      <div className="function-2d-graph">
        <SafePlot
          data={plotData}
          layout={plotLayout}
          onRelayout={handleRelayout}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
          config={{
            displayModeBar: false,
            scrollZoom: true,
            doubleClick: 'reset'
          }}
        />
      </div>

      {/* AI Suggestion Chips - Top Center */}
      {expression && (
        <div className="ai-chips-container">
          <div className="ai-chips-header">
            <Sparkles size={14} className="text-cyan-400" />
            <span>Try:</span>
          </div>
          <div className="ai-chips">
            {loadingSuggestions ? (
              <div className="ai-chip loading">
                <Loader2 size={14} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            ) : (
              suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(sug.expr)}
                  className="ai-chip"
                  title={sug.expr}
                >
                  {sug.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Equation Label */}
      {!error && expression && (
        <div className="function-2d-equation">
          <InlineMath math={`f(x) = ${latexEquation}`} />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="function-2d-error">{error}</div>
      )}

      {/* Custom Navigation HUD */}
      <div className="function-2d-hud">
        <button onClick={handleZoomIn} className="function-hud-btn" title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button onClick={handleZoomOut} className="function-hud-btn" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <div className="function-hud-divider" />
        <button onClick={handleReset} className="function-hud-btn" title="Reset View">
          <Home size={18} />
        </button>
        <button
          onClick={toggleDragMode}
          className={`function-hud-btn ${dragMode === 'zoom' ? 'active' : ''}`}
          title={dragMode === 'pan' ? 'Switch to Zoom' : 'Switch to Pan'}
        >
          {dragMode === 'pan' ? <Move size={18} /> : <Crosshair size={18} />}
        </button>
      </div>

      {/* Range Info */}
      <div className="function-2d-info">
        <span>X: [{xRange[0].toFixed(1)}, {xRange[1].toFixed(1)}]</span>
      </div>
    </div>
  );
}
