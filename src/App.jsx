import { useState, useEffect } from "react";
import SceneRouter from "./renderers/SceneRouter.jsx";
import { interpretPromptToJson } from "./agent/interpret.js";
import { Loader2, Send, MessageSquare } from "lucide-react";
import MathLab from "./lab/MathLab";
import Home from "./pages/Home";
import AppShell from "./components/layout/AppShell";

export default function App() {
  const [activeView, setActiveView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // -- STATE --
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("math_agent_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState(null);

  // Persist history
  useEffect(() => {
    localStorage.setItem("math_agent_history", JSON.stringify(history));
  }, [history]);

  function clearHistory() {
    setHistory([]);
  }

  // -- HANDLERS --
  const handleGenerate = async (inputPrompt) => {
    const text = inputPrompt || prompt;
    if (!text || !text.trim()) return;

    // Switch to chat if not already
    if (activeView !== 'chat') setActiveView('chat');

    setLoading(true);

    // Update History
    if (!history.includes(text)) {
      setHistory(prev => [text, ...prev].slice(0, 20));
    }

    try {
      const result = await interpretPromptToJson(text);
      setSpec(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- APP SHELL DIRECT ACCESS ---
  // The 'home' view is now a dashboard within the shell, or we skip it entirely.
  // For now, we skip the marketing landing page.


  // --- APP SHELL ---
  // If we're on Home, show full-screen landing (no shell wrapper needed)
  if (activeView === 'home') {
    return <Home onNavigate={setActiveView} />;
  }

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeView={activeView}
      onNavigate={setActiveView}
      history={history}
      title={activeView === 'lab' ? "Math Lab" : activeView === 'chat' ? "Agent Chat" : "Home"}
      onHistoryClick={(text) => {
        setPrompt(text);
        setActiveView('chat');
        handleGenerate(text);
      }}
      onClearHistory={clearHistory}
    >
      {/* VIEW: LAB */}
      {activeView === 'lab' && (
        <MathLab />
      )}

      {/* VIEW: CHAT */}
      {activeView === 'chat' && (
        <div className="chat-layout">
          {/* Visualization Stage */}
          <div className="chat-stage">
            {loading && (
              <div className="stage-overlay">
                <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin mb-4" />
                <p className="text-sm text-[var(--primary)] font-medium">Processing query...</p>
              </div>
            )}

            <div className="chat-stage-body">
              {spec ? (
                <SceneRouter spec={spec} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="chat-placeholder">
                    <div className="chat-placeholder-icon">
                      <MessageSquare size={28} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Welcome to Math Agent</h3>
                    <p className="text-sm text-[var(--text-muted)]">Enter a mathematical query below to generate visualizations and analysis.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Console */}
          <div className="input-row">
            <textarea
              className="chat-input"
              rows={2}
              placeholder="Enter mathematical query (e.g., 'plot sin(x) from -10 to 10')..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !prompt.trim()}
              className="btn btn-primary"
            >
              <Send size={16} />
              RUN
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
