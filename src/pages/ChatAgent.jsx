import React, { useMemo, useState, useEffect } from "react";
import SceneRouter from "../renderers/SceneRouter.jsx";
import { Loader2, Send, MessageSquare, BrainCircuit } from "lucide-react";

const SUGGESTIONS = [
  "Show Resultant (Sum)",
  "Visualize Dot Product",
  "Find Unit Vector"
];

const defaultVectorControls = {
  showHeadToTail: false,
  showResultant: false,
  showLabels: true,
  is3D: false,
  scale: 1
};

export default function ChatAgent({
  spec,
  loading,
  prompt,
  onPromptChange,
  onSend,
  apiError,
  messages = [],
  onSuggestion
}) {
  const [activeTab, setActiveTab] = useState("chat");
  const [vectorControls, setVectorControls] = useState(defaultVectorControls);

  const coreSpec = spec?.payload || spec?.params || spec || null;
  const isVectorSpec = Boolean(coreSpec?.math?.kind?.includes("vector"));

  useEffect(() => {
    if (!coreSpec?.view) return;
    const is3D = coreSpec.view?.dimension === "3D" || coreSpec.view?.type === "line3d";
    setVectorControls((prev) => ({ ...prev, is3D }));
  }, [coreSpec?.view]);

  const augmentedSpec = useMemo(() => {
    if (!spec) return null;
    const ui = { ...(spec.ui || {}), tight: true, vectorControls };
    return {
      ...spec,
      ui,
      payload: spec.payload ? { ...spec.payload, ui } : spec.payload,
      params: spec.params ? { ...spec.params, ui } : spec.params
    };
  }, [spec, vectorControls]);

  const analysis = useMemo(() => buildVectorAnalysis(coreSpec), [coreSpec]);

  return (
    <div className="chat-workspace">
      <section className="chat-canvas">
        <div className="chat-canvas-toolbar">
          <div className="chat-canvas-title">
            <BrainCircuit className="h-4 w-4 text-cyan-300" />
            <span>Visualization</span>
          </div>
          {isVectorSpec && (
            <div className="chat-vector-toolbar">
              <label>
                <input
                  type="checkbox"
                  checked={vectorControls.showHeadToTail}
                  onChange={(event) =>
                    setVectorControls((prev) => ({ ...prev, showHeadToTail: event.target.checked }))
                  }
                />
                Head-to-Tail
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={vectorControls.showResultant}
                  onChange={(event) =>
                    setVectorControls((prev) => ({ ...prev, showResultant: event.target.checked }))
                  }
                />
                Sum
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={vectorControls.showLabels}
                  onChange={(event) =>
                    setVectorControls((prev) => ({ ...prev, showLabels: event.target.checked }))
                  }
                />
                Labels
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={vectorControls.is3D}
                  onChange={(event) =>
                    setVectorControls((prev) => ({ ...prev, is3D: event.target.checked }))
                  }
                />
                3D
              </label>
              <div className="chat-vector-scale">
                <span>Scale {vectorControls.scale.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={vectorControls.scale}
                  onChange={(event) =>
                    setVectorControls((prev) => ({ ...prev, scale: Number(event.target.value) }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="chat-canvas-body">
          {loading && (
            <div className="chat-canvas-loading">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Rendering...</span>
            </div>
          )}
          {augmentedSpec ? (
            <SceneRouter spec={augmentedSpec} />
          ) : (
            <div className="chat-placeholder">
              <div className="chat-placeholder-icon">
                <MessageSquare size={28} />
              </div>
              <h3>Welcome to Math Agent</h3>
              <p>Enter a mathematical query below to generate visualizations and analysis.</p>
              {apiError && <p className="chat-error">{apiError}</p>}
            </div>
          )}
        </div>
      </section>

      <aside className="chat-sidebar">
        <div className="chat-tabs">
          <button
            type="button"
            className={`chat-tab ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            className={`chat-tab ${activeTab === "analysis" ? "active" : ""}`}
            onClick={() => setActiveTab("analysis")}
          >
            Analysis
          </button>
        </div>

        {activeTab === "chat" ? (
          <div className="chat-panel">
            <div className="chat-history">
              {messages.length ? (
                messages.map((msg, idx) => (
                  <div key={`${msg.role}-${idx}`} className={`chat-bubble ${msg.role}`}>
                    {msg.text}
                  </div>
                ))
              ) : (
                <div className="chat-empty">No messages yet.</div>
              )}
            </div>

            <div className="chat-suggestions">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="chat-chip"
                  onClick={() => onSuggestion?.(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="chat-input-row">
              <textarea
                className="chat-input"
                rows={2}
                placeholder="Enter a math query..."
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => onSend()}
                disabled={loading || !prompt.trim()}
                className="chat-send-btn"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                Run
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-panel chat-analysis">
            {analysis ? (
              <>
                <div className="analysis-section">
                  <h4>Selected Vectors</h4>
                  <div className="analysis-row analysis-a">
                    <span>Vector A</span>
                    <span>{analysis.vectorA}</span>
                  </div>
                  <div className="analysis-row analysis-b">
                    <span>Vector B</span>
                    <span>{analysis.vectorB}</span>
                  </div>
                </div>
                <div className="analysis-section">
                  <h4>Computed Properties</h4>
                  <div className="analysis-row">
                    <span>Magnitude A</span>
                    <span>{analysis.magA}</span>
                  </div>
                  <div className="analysis-row">
                    <span>Magnitude B</span>
                    <span>{analysis.magB}</span>
                  </div>
                  <div className="analysis-row">
                    <span>Dot Product</span>
                    <span>{analysis.dot}</span>
                  </div>
                  <div className="analysis-row">
                    <span>Angle</span>
                    <span>{analysis.angle}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="chat-empty">Vector analysis appears here when vectors are drawn.</div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function buildVectorAnalysis(data) {
  if (!data?.math) return null;
  const rawVectors = data.math.vectors || data.math.data?.vectors;
  if (!rawVectors) return null;

  const list = [];
  if (Array.isArray(rawVectors)) {
    rawVectors.forEach((v, idx) => {
      if (Array.isArray(v)) {
        list.push({ label: `v${idx + 1}`, components: v });
      } else {
        list.push({
          label: v.label || v.name || `v${idx + 1}`,
          components: v.components || v.vector || [0, 0, 0]
        });
      }
    });
  } else if (typeof rawVectors === "object") {
    Object.entries(rawVectors).forEach(([key, val]) => {
      list.push({ label: key, components: val });
    });
  }

  if (list.length < 2) return null;

  const a = normalizeVector(list[0].components);
  const b = normalizeVector(list[1].components);
  const magA = magnitude(a);
  const magB = magnitude(b);
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const angle = magA && magB ? Math.acos(dot / (magA * magB)) : null;

  return {
    vectorA: formatVector(a),
    vectorB: formatVector(b),
    magA: magA.toFixed(3),
    magB: magB.toFixed(3),
    dot: dot.toFixed(3),
    angle: angle === null ? "—" : `${(angle * 180 / Math.PI).toFixed(2)}°`
  };
}

function normalizeVector(vec) {
  return [vec?.[0] || 0, vec?.[1] || 0, vec?.[2] || 0];
}

function magnitude(vec) {
  return Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
}

function formatVector(vec) {
  return `(${vec[0].toFixed(2)}, ${vec[1].toFixed(2)}, ${vec[2].toFixed(2)})`;
}
