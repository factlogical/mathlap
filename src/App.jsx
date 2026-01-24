import { useState, useEffect } from "react";
import { interpretPromptToJson } from "./agent/interpret.js";
import MathLab from "./lab/MathLab";
import Home from "./pages/Home";
import AppShell from "./components/layout/AppShell";
import NeuralPlayground from "./pages/NeuralPlayground";
import ChatAgent from "./pages/ChatAgent";

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
  const [apiError, setApiError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

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

    setApiError("");
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    // Update History
    if (!history.includes(text)) {
      setHistory(prev => [text, ...prev].slice(0, 20));
    }

    try {
      const result = await interpretPromptToJson(text);
      setSpec(result);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: describeSpec(result) }
      ]);
    } catch (err) {
      console.error(err);
      setSpec(null);
      setApiError("API server is offline. Start it from /server with: npm start");
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "تعذر الاتصال بالخادم. شغّل السيرفر أولاً." }
      ]);
    } finally {
      setLoading(false);
      setPrompt("");
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
      title={
        activeView === 'lab'
          ? "Math Lab"
          : activeView === 'chat'
            ? "Agent Chat"
            : activeView === 'neural'
              ? "Computer Science Lab"
              : "Home"
      }
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

      {/* VIEW: NEURAL */}
      {activeView === 'neural' && (
        <NeuralPlayground />
      )}

      {/* VIEW: CHAT */}
      {activeView === 'chat' && (
        <ChatAgent
          spec={spec}
          loading={loading}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSend={() => handleGenerate()}
          apiError={apiError}
          messages={chatMessages}
          onSuggestion={(text) => handleGenerate(text)}
        />
      )}
    </AppShell>
  );
}

function describeSpec(spec) {
  const data = spec?.payload || spec?.params || spec || {};
  const math = data.math || {};
  const view = data.view || {};
  const dim = view.dimension || (view.type === "surface" ? "3D" : "2D");
  const kind = math.kind || "plot";
  const expr = math.expression || "";

  if (kind.includes("vector")) {
    return `Drawing vectors in ${dim}. You can inspect dot product and magnitude in Analysis.`;
  }
  if (data.transform?.op === "partial_derivative") {
    return `Plotted derivative of ${expr} in ${dim}.`;
  }
  if (expr) {
    return `Plotted ${expr} in ${dim}.`;
  }
  return "Visualization is ready.";
}
