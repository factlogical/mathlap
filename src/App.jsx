import { lazy, Suspense, useEffect, useState, startTransition } from "react";
import { interpretPromptToJson } from "./agent/interpret.js";
import Home from "./pages/Home";
import AppShell from "./components/layout/AppShell";
import LabErrorBoundary from "./components/LabErrorBoundary.jsx";
import LabLoadingScreen from "./components/shared/LabLoadingScreen.jsx";
import NotFound from "./pages/NotFound.jsx";
import { useUISettings } from "./context/UISettingsContext.jsx";

const MathLab = lazy(() => import("./lab/MathLab"));
const ComputerScienceLab = lazy(() => import("./pages/ComputerScienceLab"));
const PhysicsLab = lazy(() => import("./pages/PhysicsLab"));
const ChatAgent = lazy(() => import("./pages/ChatAgent"));

const KNOWN_VIEWS = new Set(["home", "lab", "chat", "neural", "physics"]);

export default function App() {
  const { t } = useUISettings();
  const [activeView, setActiveView] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("math_agent_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState(null);
  const [apiError, setApiError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("math_agent_history", JSON.stringify(history));
  }, [history]);

  const pageTitle = getViewTitle(activeView, t);

  useEffect(() => {
    document.title = `${t("مختبر الرياضيات التفاعلي", "Interactive Math Lab")} | ${pageTitle}`;
  }, [pageTitle, t]);

  function clearHistory() {
    setHistory([]);
  }

  const handleGenerate = async (inputPrompt) => {
    let text = inputPrompt || prompt;
    if (!text || !text.trim()) return;

    const prefixMatch = text.match(/^@(vector|limit|nn)\s+(.+)$/i);
    const routingHint = prefixMatch ? prefixMatch[1].toLowerCase() : null;
    if (prefixMatch) {
      text = prefixMatch[2];
    }

    setApiError("");
    setChatMessages((prev) => [...prev, { role: "user", text: inputPrompt || prompt }]);

    queueMicrotask(() => {
      if (!history.includes(text)) {
        setHistory((prev) => [text, ...prev].slice(0, 20));
      }
    });

    if (!isOnline) {
      const offlineMsg = t("الشات يحتاج اتصالاً بالإنترنت.", "Chat needs an internet connection.");
      setApiError(offlineMsg);
      setChatMessages((prev) => [...prev, { role: "assistant", text: offlineMsg }]);
      return;
    }

    setLoading(true);

    try {
      const result = await interpretPromptToJson(text);

      startTransition(() => {
        setSpec(result);
        const sceneType = result?.scene?.type;
        const mathKind = result?.payload?.math?.kind || result?.params?.math?.kind;
        const nextView = getViewForScene(sceneType, mathKind, routingHint);
        if (nextView && nextView !== activeView) {
          setActiveView(nextView);
        }
      });

      setChatMessages((prev) => [...prev, { role: "assistant", text: describeSpec(result, t) }]);
    } catch (err) {
      console.error(err);
      const message = String(err?.message || "");
      const offlineError = !isOnline || /offline/i.test(message);
      const offlineMsg = t("الشات يحتاج اتصالاً بالإنترنت.", "Chat needs an internet connection.");

      setSpec(null);
      setApiError(offlineError ? offlineMsg : "API server is offline. Start it from /server with: npm start");
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: offlineError
            ? offlineMsg
            : t("تعذّر الاتصال بالخادم. شغّل الخادم أولًا.", "Could not reach the server. Please start it first.")
        }
      ]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  if (activeView === "home") {
    return <Home onNavigate={setActiveView} />;
  }

  const isKnownView = KNOWN_VIEWS.has(activeView);

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      activeView={activeView}
      onNavigate={setActiveView}
      history={history}
      title={pageTitle}
      onHistoryClick={(text) => {
        setPrompt(text);
        setActiveView("chat");
        handleGenerate(text);
      }}
      onClearHistory={clearHistory}
    >
      {!isOnline && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
          {t(
            "أنت حالياً بدون اتصال. المختبرات المحلية تعمل، لكن الشات يحتاج إنترنت.",
            "You are offline. Local labs still work, but chat needs internet."
          )}
        </div>
      )}

      {activeView === "lab" && (
        <LabErrorBoundary resetKey="lab-view">
          <Suspense
            fallback={
              <LabLoadingScreen
                name={t("مختبر الرياضيات", "Math Lab")}
                hint={t("جاري تجهيز الأدوات البصرية...", "Preparing visualization tools...")}
              />
            }
          >
            <MathLab initialLab={spec?.scene?.type === "epsilon_delta_limit" ? "epsilon-delta" : undefined} />
          </Suspense>
        </LabErrorBoundary>
      )}

      {activeView === "neural" && (
        <LabErrorBoundary resetKey="neural-view">
          <Suspense
            fallback={
              <LabLoadingScreen
                name={t("مختبر علوم الحاسوب", "Computer Science Lab")}
                hint={t("جاري تهيئة الشبكات والتدريب...", "Preparing networks and training...")}
              />
            }
          >
            <ComputerScienceLab />
          </Suspense>
        </LabErrorBoundary>
      )}

      {activeView === "physics" && (
        <LabErrorBoundary resetKey="physics-view">
          <Suspense
            fallback={
              <LabLoadingScreen
                name={t("مختبر الفيزياء", "Physics Lab")}
                hint={t("جاري تحميل تجربة فورييه...", "Loading Fourier experience...")}
              />
            }
          >
            <PhysicsLab />
          </Suspense>
        </LabErrorBoundary>
      )}

      {activeView === "chat" && (
        <LabErrorBoundary resetKey="chat-view">
          <Suspense
            fallback={
              <LabLoadingScreen
                name={t("الشات الذكي", "AI Chat")}
                hint={t("جاري تشغيل مساعد الرياضيات...", "Starting math assistant...")}
              />
            }
          >
            <ChatAgent
              spec={spec}
              loading={loading}
              prompt={prompt}
              onPromptChange={setPrompt}
              onSend={() => handleGenerate()}
              apiError={apiError}
              messages={chatMessages}
              isOnline={isOnline}
            />
          </Suspense>
        </LabErrorBoundary>
      )}

      {!isKnownView && <NotFound onGoHome={() => setActiveView("home")} />}
    </AppShell>
  );
}

function getViewTitle(activeView, t) {
  if (activeView === "lab") return t("مختبر الرياضيات", "Math Lab");
  if (activeView === "chat") return t("شات الوكيل", "Agent Chat");
  if (activeView === "neural") return t("مختبر علوم الحاسوب", "Computer Science Lab");
  if (activeView === "physics") return t("مختبر الفيزياء", "Physics Lab");
  if (activeView === "home") return t("الرئيسية", "Home");
  return t("صفحة غير موجودة", "Not Found");
}

function getViewForScene(sceneType, mathKind, routingHint) {
  if (routingHint === "vector") return "chat";
  if (routingHint === "limit") return "lab";
  if (routingHint === "nn") return "neural";

  if (sceneType === "vector_field" || sceneType === "vector_operation" || sceneType === "vectors") {
    return "chat";
  }
  if (sceneType === "epsilon_delta_limit") {
    return "lab";
  }
  if (sceneType === "neural_network") {
    return "neural";
  }

  if (mathKind && mathKind.includes("vector")) {
    return "chat";
  }

  return "chat";
}

function describeSpec(spec, t = (ar, en) => ar || en) {
  const data = spec?.payload || spec?.params || spec || {};
  const math = data.math || {};
  const view = data.view || {};
  const dim = view.dimension || (view.type === "surface" ? "3D" : "2D");
  const kind = math.kind || "plot";
  const expr = math.expression || "";

  if (kind.includes("vector")) {
    return t(
      `تم رسم المتجهات في ${dim}. يمكنك فحص الضرب النقطي والمقدار من لوحة التحليل.`,
      `Drawing vectors in ${dim}. You can inspect dot product and magnitude in Analysis.`
    );
  }
  if (data.transform?.op === "partial_derivative") {
    return t(`تم رسم مشتقة ${expr} في ${dim}.`, `Plotted derivative of ${expr} in ${dim}.`);
  }
  if (expr) {
    return t(`تم رسم ${expr} في ${dim}.`, `Plotted ${expr} in ${dim}.`);
  }
  return t("التصور جاهز.", "Visualization is ready.");
}
