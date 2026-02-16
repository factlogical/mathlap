import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUISettings } from "../../context/UISettingsContext.jsx";
import LabIntroModal from "../../components/shared/LabIntroModal.jsx";
import { NEAT_INTRO_SLIDES } from "../../components/shared/introSlides/NEATIntroSlides.js";
import NEATHeader from "./components/NEATHeader.jsx";
import PopulationView from "./components/PopulationView.jsx";
import GenomeView from "./components/GenomeView.jsx";
import EnvironmentView from "./components/EnvironmentView.jsx";
import DashboardView from "./components/DashboardView.jsx";
import AlgorithmControls from "./components/AlgorithmControls.jsx";
import "./NEATLab.css";

const INTRO_LAB_ID = "neat";
const INTRO_SEEN_KEY = `${INTRO_LAB_ID}_intro_seen`;

const INITIAL_STATS = {
  gen: 0,
  best: 0,
  avg: 0,
  worst: 0,
  species: 0,
  nodes: 0,
  conns: 0,
  populationSize: 0
};

const DEFAULT_CONFIG = {
  populationSize: 150,
  compatibilityThreshold: 3.0,
  weightMutationRate: 0.8,
  addConnectionRate: 0.05,
  addNodeRate: 0.03,
  crossoverRate: 0.75,
  interSpeciesMateRate: 0.001,
  survivalRate: 0.25,
  allowRecurrent: false,
  activation: "tanh",
  maxStaleGenerations: 15,
  maxStepsPerEval: 1000
};

const DEFAULT_VIEW_OPTIONS = {
  showSidePanels: true,
  showHud: true,
  showExplanations: true,
  showSpeciesMap: true,
  showToolRow: true
};

const PRESETS = {
  fast: {
    populationSize: 60,
    weightMutationRate: 0.9,
    addConnectionRate: 0.1,
    addNodeRate: 0.02,
    compatibilityThreshold: 2.5,
    survivalRate: 0.2,
    crossoverRate: 0.65,
    interSpeciesMateRate: 0.002,
    allowRecurrent: false,
    activation: "relu",
    maxStepsPerEval: 600,
    maxStaleGenerations: 10
  },
  balanced: {
    populationSize: 150,
    weightMutationRate: 0.8,
    addConnectionRate: 0.05,
    addNodeRate: 0.03,
    compatibilityThreshold: 3.0,
    survivalRate: 0.25,
    crossoverRate: 0.75,
    interSpeciesMateRate: 0.001,
    allowRecurrent: false,
    activation: "tanh",
    maxStepsPerEval: 1000,
    maxStaleGenerations: 15
  },
  quality: {
    populationSize: 300,
    weightMutationRate: 0.72,
    addConnectionRate: 0.035,
    addNodeRate: 0.02,
    compatibilityThreshold: 2.6,
    survivalRate: 0.32,
    crossoverRate: 0.82,
    interSpeciesMateRate: 0.002,
    allowRecurrent: false,
    activation: "tanh",
    maxStepsPerEval: 1600,
    maxStaleGenerations: 24
  }
};

const TABS = [
  { id: "population", icon: "🫧", label: { ar: "المجتمع", en: "Population" } },
  { id: "genome", icon: "🧬", label: { ar: "الجينوم", en: "Genome" } },
  { id: "environment", icon: "🎮", label: { ar: "البيئة", en: "Environment" } },
  { id: "dashboard", icon: "📊", label: { ar: "الإحصائيات", en: "Dashboard" } },
  { id: "settings", icon: "⚙️", label: { ar: "الإعدادات", en: "Settings" } }
];

function normalizeWorkerType(type) {
  return String(type || "").toUpperCase();
}

export default function NEATLabRenderer() {
  const { isArabic, t } = useUISettings();

  const [activeTab, setActiveTab] = useState("population");
  const [selectedGenomeId, setSelectedGenomeId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [history, setHistory] = useState([]);
  const [population, setPopulation] = useState([]);
  const [bestGenome, setBestGenome] = useState(null);
  const [genomeDetailsById, setGenomeDetailsById] = useState({});
  const [statusMessage, setStatusMessage] = useState(t("جاري تهيئة محرك NEAT...", "Initializing NEAT engine..."));
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [viewOptions, setViewOptions] = useState(DEFAULT_VIEW_OPTIONS);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(INTRO_SEEN_KEY) !== "true";
  });

  const workerRef = useRef(null);
  const runningRef = useRef(false);

  const postWorker = useCallback((message) => {
    workerRef.current?.postMessage(message);
  }, []);

  const cacheGenomeDetails = useCallback((genome) => {
    if (!genome?.id) return;
    setGenomeDetailsById((previous) => ({
      ...previous,
      [genome.id]: genome
    }));
  }, []);

  const selectedGenome = useMemo(() => {
    if (selectedGenomeId != null && genomeDetailsById[selectedGenomeId]) {
      return genomeDetailsById[selectedGenomeId];
    }
    if (bestGenome && selectedGenomeId === bestGenome.id) return bestGenome;
    return bestGenome || null;
  }, [bestGenome, genomeDetailsById, selectedGenomeId]);

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot) return;

    const nextPopulation = snapshot.population || [];
    const nextBest = snapshot.best || null;
    const fullPopulationGenomes = Array.isArray(snapshot.populationGenomes)
      ? snapshot.populationGenomes
      : [];

    setPopulation(nextPopulation);
    setHistory(snapshot.history || []);
    setStats(snapshot.stats || INITIAL_STATS);
    setBestGenome(nextBest);
    if (fullPopulationGenomes.length) {
      setGenomeDetailsById(() => {
        const next = {};
        fullPopulationGenomes.forEach((genome) => {
          if (genome?.id != null) next[genome.id] = genome;
        });
        return next;
      });
    }
    if (nextBest) cacheGenomeDetails(nextBest);

    if (snapshot.config) {
      setConfig(snapshot.config);
    }

    if (Object.prototype.hasOwnProperty.call(snapshot, "running")) {
      setIsRunning(Boolean(snapshot.running));
      runningRef.current = Boolean(snapshot.running);
    }

    setSelectedGenomeId((previous) => {
      if (previous != null && nextPopulation.some((genome) => genome.id === previous)) {
        return previous;
      }
      return nextBest?.id ?? null;
    });
  }, [cacheGenomeDetails]);

  const handleControl = (action) => {
    setErrorMessage("");

    if (action === "toggle_panels") {
      setViewOptions((previous) => ({
        ...previous,
        showSidePanels: !previous.showSidePanels
      }));
      return;
    }

    if (action === "toggle_hud") {
      setViewOptions((previous) => ({
        ...previous,
        showHud: !previous.showHud
      }));
      return;
    }

    if (action === "toggle_help") {
      setViewOptions((previous) => ({
        ...previous,
        showExplanations: !previous.showExplanations
      }));
      return;
    }

    if (action === "toggle_tool_row") {
      setViewOptions((previous) => ({
        ...previous,
        showToolRow: !previous.showToolRow
      }));
      return;
    }

    if (!workerRef.current) return;

    if (action === "run") {
      postWorker({ type: "START" });
      runningRef.current = true;
      setIsRunning(true);
      setStatusMessage(t("تشغيل التطور التلقائي...", "Running continuous evolution..."));
      return;
    }

    if (action === "pause") {
      postWorker({ type: "STOP" });
      runningRef.current = false;
      setIsRunning(false);
      setStatusMessage(t("تم إيقاف التطور", "Evolution paused"));
      return;
    }

    if (action === "step") {
      if (isRunning) return;
      setStatusMessage(t("تنفيذ جيل واحد...", "Running one generation..."));
      postWorker({ type: "STEP" });
      return;
    }

    if (action === "reset" || action === "reset_network") {
      runningRef.current = false;
      setIsRunning(false);
      setProgress(0);
      setStatusMessage(t("إعادة الشبكة من الصفر بالإعدادات الحالية...", "Resetting network from scratch with current config..."));
      setSelectedGenomeId(null);
      setGenomeDetailsById({});
      setPopulation([]);
      setBestGenome(null);
      setHistory([]);
      setStats(INITIAL_STATS);
      postWorker({ type: "RESET", payload: config });
    }
  };

  const handleConfigChange = (key, value) => {
    if (isRunning) return;

    setConfig((previous) => {
      const next = {
        ...previous,
        [key]: value
      };
      postWorker({ type: "UPDATE_CONFIG", payload: next });
      return next;
    });
  };

  const handleViewOptionChange = (key, value) => {
    setViewOptions((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleApplyPreset = (presetId) => {
    if (isRunning) return;
    const preset = PRESETS[presetId];
    if (!preset) return;

    const nextConfig = {
      ...config,
      ...preset
    };
    setConfig(nextConfig);
    setStatusMessage(t("تم تطبيق الإعداد الجاهز", "Preset applied"));
    postWorker({ type: "UPDATE_CONFIG", payload: nextConfig });
  };

  const replayIntro = () => {
    try {
      window.localStorage.removeItem(INTRO_SEEN_KEY);
    } catch {
      // ignore storage failures
    }
    setShowIntro(true);
  };

  const viewGenomeDNA = (genome) => {
    if (!genome) return;
    setSelectedGenomeId(genome.id);
    setActiveTab("genome");
  };

  const watchGenomePlay = (genome) => {
    if (!genome) return;
    setSelectedGenomeId(genome.id);
    setActiveTab("environment");
  };

  useEffect(() => {
    if (selectedGenomeId == null) return;
    if (genomeDetailsById[selectedGenomeId]) return;
    postWorker({
      type: "REQUEST_GENOME",
      payload: { id: selectedGenomeId }
    });
  }, [genomeDetailsById, postWorker, selectedGenomeId]);

  useEffect(() => {
    const worker = new Worker(new URL("./core/neat.worker.js", import.meta.url), {
      type: "module"
    });

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const data = event.data || {};
      const type = normalizeWorkerType(data.type);

      if (type === "PROGRESS") {
        setProgress(Math.max(0, Math.min(1, Number(data.progress || 0))));
        return;
      }

      if (type === "GENOME_DETAILS") {
        if (data.genome) cacheGenomeDetails(data.genome);
        return;
      }

      if (["INITED", "RESET", "STATE", "CONFIG_UPDATED", "ENV_SIZE_UPDATED", "GENERATION_COMPLETE"].includes(type)) {
        applySnapshot(data.snapshot);

        if (type === "GENERATION_COMPLETE") {
          setProgress(1);
          const nextGeneration = data.snapshot?.stats?.gen ?? data.snapshot?.generation ?? "--";
          setStatusMessage(`${t("اكتمل جيل", "Generation complete")} #${nextGeneration}`);
          if (!runningRef.current) {
            setProgress(0);
          }
        }

        if (type === "INITED") {
          setStatusMessage(t("المحرك جاهز", "Engine ready"));
        }

        if (type === "CONFIG_UPDATED") {
          setStatusMessage(t("تم تحديث الإعدادات", "Settings updated"));
        }

        if (type === "RESET") {
          setStatusMessage(t("تمت إعادة الضبط", "Reset complete"));
          setProgress(0);
        }

        return;
      }

      if (type === "STATUS") {
        if (data.message === "RUNNING") {
          setIsRunning(true);
          runningRef.current = true;
          setStatusMessage(t("التطور يعمل بشكل مستمر", "Continuous evolution is running"));
        }
        if (data.message === "PAUSED") {
          setIsRunning(false);
          runningRef.current = false;
          setProgress(0);
          setStatusMessage(t("تم إيقاف التطور", "Evolution paused"));
        }
        applySnapshot(data.snapshot);
        return;
      }

      if (type === "ERROR") {
        setIsRunning(false);
        runningRef.current = false;
        setProgress(0);
        setErrorMessage(data.message || t("خطأ غير متوقع في عامل NEAT", "Unexpected NEAT worker error"));
        setStatusMessage(t("تم إيقاف التنفيذ بسبب خطأ", "Execution stopped due to an error"));
      }
    };

    worker.postMessage({
      type: "INIT",
      payload: config
    });

    return () => {
      runningRef.current = false;
      worker.postMessage({ type: "STOP" });
      worker.terminate();
      workerRef.current = null;
    };
  }, [applySnapshot, cacheGenomeDetails]);

  return (
    <div className="neat-lab" dir={isArabic ? "rtl" : "ltr"}>
      {showIntro && (
        <LabIntroModal
          labId={INTRO_LAB_ID}
          slides={NEAT_INTRO_SLIDES}
          accentColor="#38bdf8"
          isArabic={isArabic}
          onClose={() => setShowIntro(false)}
        />
      )}

      <NEATHeader
        stats={stats}
        isRunning={isRunning}
        progress={progress}
        viewOptions={viewOptions}
        onControl={handleControl}
        onReplayIntro={replayIntro}
      />

      <div className="neat-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`neat-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {isArabic ? tab.label.ar : tab.label.en}
          </button>
        ))}
      </div>

      <div className="neat-main">
        {activeTab === "population" && (
          <PopulationView
            population={population}
            generation={stats.gen}
            selectedId={selectedGenome?.id}
            viewOptions={viewOptions}
            onSelect={(genome) => {
              const genomeId = genome?.id ?? null;
              setSelectedGenomeId(genomeId);
              if (genomeId != null) {
                postWorker({
                  type: "REQUEST_GENOME",
                  payload: { id: genomeId }
                });
              }
            }}
            onViewDNA={viewGenomeDNA}
            onViewPlay={watchGenomePlay}
          />
        )}

        {activeTab === "genome" && <GenomeView genome={selectedGenome} />}

        {activeTab === "environment" && (
          <EnvironmentView
            population={population}
            genomeDetailsById={genomeDetailsById}
            bestGenome={bestGenome}
            selectedGenome={selectedGenome}
            stats={stats}
            progress={progress}
            isRunning={isRunning}
            viewOptions={viewOptions}
            onSelectGenome={(genome) => {
              if (!genome?.id) return;
              setSelectedGenomeId(genome.id);
              postWorker({
                type: "REQUEST_GENOME",
                payload: { id: genome.id }
              });
            }}
          />
        )}

        {activeTab === "dashboard" && <DashboardView stats={stats} history={history} />}

        {activeTab === "settings" && (
          <AlgorithmControls
            config={config}
            isRunning={isRunning}
            viewOptions={viewOptions}
            onChange={handleConfigChange}
            onViewOptionChange={handleViewOptionChange}
            onApplyPreset={handleApplyPreset}
            onResetNetwork={() => handleControl("reset_network")}
          />
        )}
      </div>

      <div className="neat-status">
        <span>
          <strong>{errorMessage ? t("خطأ", "Error") : t("الحالة", "Status")}:</strong>{" "}
          {errorMessage || statusMessage}
        </span>
        <span>
          NEAT v1.2 | {t("المجتمع", "Population")}: {stats.populationSize || population.length || 0} | {t("التفعيل", "Activation")}: {config.activation}
        </span>
      </div>
    </div>
  );
}
