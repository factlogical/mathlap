import React, { useMemo, useState, useEffect } from "react";
import SceneRouter from "../renderers/SceneRouter.jsx";
import { Loader2, Send, MessageSquare, BrainCircuit } from "lucide-react";

const CHAT_SUGGESTIONS = [
  "plot sin(x)",
  "vector v=(1,2)",
  "surface z=x*y",
  "epsilon-delta for (x^2-4)/(x-2) at 2"
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
  messages = []
}) {
  const [activeTab, setActiveTab] = useState("chat");
  const [vectorControls, setVectorControls] = useState(defaultVectorControls);
  const [localLoading, setLocalLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [actionSignal, setActionSignal] = useState(null);

  const coreSpec = spec?.payload || spec?.params || spec || null;
  const sceneType = spec?.scene?.type || coreSpec?.scene?.type || "generic_plot";
  const isVectorSpec = Boolean(coreSpec?.math?.kind?.includes("vector"));
  const isScalarSpec = sceneType === "generic_plot" && !isVectorSpec;
  const isBusy = loading || localLoading;

  const handleSubmit = async () => {
    if (isBusy || !prompt?.trim()) return;
    setLocalLoading(true);
    try {
      await onSend?.();
    } finally {
      setLocalLoading(false);
    }
  };

  const dispatchAction = (type) => {
    setActionSignal({ type, nonce: Date.now() });
  };

  useEffect(() => {
    if (!coreSpec?.view) return;
    const is3D = coreSpec.view?.dimension === "3D" || coreSpec.view?.type === "line3d";
    setVectorControls((prev) => ({ ...prev, is3D }));
  }, [coreSpec?.view]);

  useEffect(() => {
    if (!isVectorSpec) {
      setAnalysis(null);
    }
  }, [isVectorSpec]);

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

  const scalarActions = useMemo(() => {
    if (!isScalarSpec) return [];
    return [
      { label: "Reset View", type: "RESET_VIEW" },
      { label: "Toggle Grid", type: "TOGGLE_GRID" }
    ];
  }, [isScalarSpec]);

  return (
    <div className="chat-workspace">
      <section className="chat-canvas">
        <div className="chat-canvas-toolbar">
          <div className="chat-canvas-title">
            <BrainCircuit className="h-4 w-4 text-cyan-300" />
            <span>Visualization</span>
          </div>
          <div className="chat-canvas-actions">
            {isScalarSpec && (
              <div className="chat-canvas-controls">
                {scalarActions.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className="chat-action-btn"
                    onClick={() => dispatchAction(item.type)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
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
        </div>

        <div className="chat-canvas-body">
          {loading && (
            <div className="chat-canvas-loading">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Rendering...</span>
            </div>
          )}
          {augmentedSpec ? (
            <SceneRouter spec={augmentedSpec} action={actionSignal} onAnalysis={setAnalysis} />
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
              {CHAT_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => onPromptChange(item)}
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
                    handleSubmit();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy || !prompt.trim()}
                className="chat-send-btn"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
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
                    <span>Count</span>
                    <span>{analysis.count}</span>
                  </div>
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
                  <div className="analysis-row">
                    <span>Resultant</span>
                    <span>{analysis.resultant}</span>
                  </div>
                  <div className="analysis-row">
                    <span>|Resultant|</span>
                    <span>{analysis.resultantMag}</span>
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
