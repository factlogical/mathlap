import { useState, useEffect, startTransition } from "react";
import { interpretPromptToJson } from "./agent/interpret.js";
import MathLab from "./lab/MathLab";
import Home from "./pages/Home";
import AppShell from "./components/layout/AppShell";
import ComputerScienceLab from "./pages/ComputerScienceLab";
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
    let text = inputPrompt || prompt;
    if (!text || !text.trim()) return;

    // Parse prefix commands for deterministic routing
    const prefixMatch = text.match(/^@(vector|limit|nn)\s+(.+)$/i);
    const routingHint = prefixMatch ? prefixMatch[1].toLowerCase() : null;
    if (prefixMatch) {
      text = prefixMatch[2]; // Strip prefix for API
    }

    setApiError("");
    setChatMessages((prev) => [...prev, { role: "user", text: inputPrompt || prompt }]);
    setLoading(true);

    // Defer history update (non-critical)
    queueMicrotask(() => {
      if (!history.includes(text)) {
        setHistory(prev => [text, ...prev].slice(0, 20));
      }
    });

    try {
      const result = await interpretPromptToJson(text);

      // Batch spec and navigation updates in a transition (lower priority)
      startTransition(() => {
        setSpec(result);
        const sceneType = result?.scene?.type;
        const mathKind = result?.payload?.math?.kind || result?.params?.math?.kind;
        const nextView = getViewForScene(sceneType, mathKind, routingHint);
        if (nextView && nextView !== activeView) {
          setActiveView(nextView);
        }
      });

      // Chat message update (high priority for UX responsiveness)
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
        <MathLab initialLab={spec?.scene?.type === "epsilon_delta_limit" ? "epsilon-delta" : undefined} />
      )}

      {/* VIEW: NEURAL */}
      {activeView === 'neural' && (
        <ComputerScienceLab />
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
        />
      )}
    </AppShell>
  );
}

function getViewForScene(sceneType, mathKind, routingHint) {
  // Priority 1: Explicit prefix routing
  if (routingHint === 'vector') return 'chat';
  if (routingHint === 'limit') return 'lab';
  if (routingHint === 'nn') return 'neural';

  // Priority 2: Deterministic scene.type routing
  if (sceneType === "vector_field" || sceneType === "vector_operation" || sceneType === "vectors") {
    return "chat";
  }
  if (sceneType === "epsilon_delta_limit") {
    return "lab";
  }
  if (sceneType === "neural_network") {
    return "neural";
  }

  // Priority 3: Fallback to math.kind check
  if (mathKind && mathKind.includes("vector")) {
    return "chat";
  }

  // Default
  return "chat";
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
