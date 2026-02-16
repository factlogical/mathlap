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
  // dataRange: Used strictly for calculating the function points (xs, ys)
  const [dataRange, setDataRange] = useState(spec.params?.xRange || [-10, 10]);

  // layoutRevision: Incremented ONLY when we want to force-reset the view (e.g. new expression, Home button)
  const [layoutRevision, setLayoutRevision] = useState(0);

  // initialLayout: stores the starting ranges to force ONLY on revision change
  const [forcedLayout, setForcedLayout] = useState(null);

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
    const newXRange = spec.params?.xRange || [-10, 10];

    setExpression(expr);
    setDataRange(newXRange);

    // Force a view reset when expression or spec changes significantly
    setLayoutRevision(prev => prev + 1);
    setForcedLayout({
      xaxis: { range: newXRange },
      yaxis: { range: [-10, 10] } // Default Y range
    });

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
          // Validation to ensure we have label and expr
          const validSuggestions = result.filter(s => s.label && s.expr).slice(0, 4);
          if (validSuggestions.length > 0) {
            setSuggestions(validSuggestions);
          }
        } else if (typeof result === 'string') {
          // Try to parse JSON from string
          const match = result.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) {
              setSuggestions(parsed.slice(0, 4));
            }
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

    // Reset view for new suggestion
    setLayoutRevision(prev => prev + 1);
    setForcedLayout({
      xaxis: { range: [-10, 10] }, // Reset to standard view
      yaxis: { range: [-10, 10] }
    });
  };

  // --- Calculate Function Data (Infinite Canvas) ---
  const { xs, ys, error, latexEquation } = useMemo(() => {
    const min = dataRange[0];
    const max = dataRange[1];
    // Add significant buffer for smooth panning (50% each side)
    // This allows the user to pan quite a bit before we need to recalculate
    const rangeWidth = max - min;
    const buffer = rangeWidth * 0.5;
    const bufferedMin = min - buffer;
    const bufferedMax = max + buffer;

    // Dynamic resolution based on range
    const resolution = Math.max(500, Math.min(3000, Math.ceil((bufferedMax - bufferedMin) * 40)));
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
  }, [dataRange, expression]);

  // --- Infinite Canvas: Handle Relayout ---
  const handleRelayout = useCallback((event) => {
    // We only care about x-axis changes to update the data generation range
    // We DO NOT update the layout state here, to avoid fighting with Plotly

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const newXRange = event['xaxis.range[0]'] !== undefined
        ? [event['xaxis.range[0]'], event['xaxis.range[1]']]
        : event['xaxis.range'] || null;

      if (newXRange && newXRange[0] !== undefined) {
        // Only update data calculation range
        setDataRange([newXRange[0], newXRange[1]]);
        // Clear forced layout so we don't accidentally enforce it later
        setForcedLayout(null);
      }
    }, 150); // Debounce data updates
  }, []);

  // --- Control Handlers ---
  const handleZoomIn = () => {
    // We can't easily get current view from Plotly state here without tracking it
    // But for a HUD, we can operate on the dataRange as a proxy for now, 
    // or just contract the range. 
    // Better pattern for stateless HUD: We accept we might reset center if we don't track view.
    // For this fix, let's just tighten the current dataRange.

    const cx = (dataRange[0] + dataRange[1]) / 2;
    const range = dataRange[1] - dataRange[0];
    const newRange = range * 0.5; // Zoom in

    const newX = [cx - newRange / 2, cx + newRange / 2];
    const newY = [-(newRange / 2), (newRange / 2)]; // Aspect ratio assumption

    setLayoutRevision(prev => prev + 1);
    setForcedLayout({
      xaxis: { range: newX },
      yaxis: { range: newY }
    });
    setDataRange(newX);
  };

  const handleZoomOut = () => {
    const cx = (dataRange[0] + dataRange[1]) / 2;
    const range = dataRange[1] - dataRange[0];
    const newRange = range * 2; // Zoom out

    const newX = [cx - newRange / 2, cx + newRange / 2];
    const newY = [-(newRange / 2), (newRange / 2)];

    setLayoutRevision(prev => prev + 1);
    setForcedLayout({
      xaxis: { range: newX },
      yaxis: { range: newY }
    });
    setDataRange(newX);
  };

  const handleReset = () => {
    const defaultRange = [-10, 10];
    setLayoutRevision(prev => prev + 1);
    setForcedLayout({
      xaxis: { range: defaultRange },
      yaxis: { range: defaultRange }
    });
    setDataRange(defaultRange);
  };

  const toggleDragMode = () => {
    setDragMode(dragMode === 'pan' ? 'zoom' : 'pan');
  };

  // --- Plot Data ---
  const plotData = useMemo(() => [
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
  ], [xs, ys]);

  // --- Layout ---
  // Memoized layout that ONLY changes on revision or essential config changes
  const plotLayout = useMemo(() => {
    const baseLayout = {
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
        gridcolor: "rgba(255, 255, 255, 0.05)",
        zerolinecolor: "rgba(255, 255, 255, 0.3)",
        zerolinewidth: 2,
        tickfont: { family: "'JetBrains Mono', monospace" },
        // Do NOT strictly enforce range here unless forced
        ...(forcedLayout?.xaxis || {})
      },
      yaxis: {
        gridcolor: "rgba(255, 255, 255, 0.05)",
        zerolinecolor: "rgba(255, 255, 255, 0.3)",
        zerolinewidth: 2,
        tickfont: { family: "'JetBrains Mono', monospace" },
        ...(forcedLayout?.yaxis || {})
      },
      showlegend: false,
      dragmode: dragMode,
      hovermode: 'x unified',
      // KEY FIX: uirevision ensures state is preserved during data updates
      uirevision: layoutRevision, // Only resets when this value changes
      datarevision: layoutRevision + xs.length // Force update when data changes
    };

    return baseLayout;
  }, [dragMode, layoutRevision, forcedLayout, xs.length]);

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
            doubleClick: 'reset',
            responsive: true
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
        <span>X: [{dataRange[0].toFixed(1)}, {dataRange[1].toFixed(1)}]</span>
      </div>
    </div>
  );
}
