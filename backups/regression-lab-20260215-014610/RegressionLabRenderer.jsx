import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Binary, BrainCircuit, Timer } from "lucide-react";
import InteractiveCanvas from "./components/InteractiveCanvas";
import LearningVisualizer from "./components/LearningVisualizer";
import LossLandscape3D from "./components/LossLandscape3D";
import ModelControls from "./components/ModelControls";
import { makeModel } from "./utils/regressionEngine";
import "./RegressionLab.css";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function minPointsForMode(mode) {
  return mode === "logistic" ? 4 : 2;
}

function hasBothClasses(points) {
  let class0 = 0;
  let class1 = 0;
  for (const point of points) {
    if (point.label === 1) class1 += 1;
    else class0 += 1;
  }
  return class0 > 0 && class1 > 0;
}

function getDefaultLearningRate(mode, variant = "linear") {
  if (mode === "logistic") return 0.02;
  if (variant === "polynomial") return 0.004;
  return 0.007;
}

function getDefaultLoss(mode) {
  return mode === "linear" ? "mse" : "bce";
}

function getLossSet(mode) {
  return mode === "linear" ? new Set(["mse", "mae", "huber"]) : new Set(["bce", "focal", "mae"]);
}

function getStopThreshold(mode, loss, variant = "linear") {
  if (mode === "linear") {
    if (variant === "polynomial") {
      if (loss === "mae") return 0.11;
      if (loss === "huber") return 0.05;
      return 0.012;
    }
    if (loss === "mae") return 0.07;
    if (loss === "huber") return 0.03;
    return 0.003;
  }
  if (loss === "focal") return 0.055;
  if (loss === "mae") return 0.095;
  return 0.062;
}

function normalizePoint(point, mode) {
  const x = clamp(Number(point.x) || 0, -5, 5);
  const y = clamp(Number(point.y) || 0, -5, 5);
  if (mode === "logistic") {
    return { x, y, label: point.label === 1 ? 1 : 0 };
  }
  return { x, y };
}

function normalizePoints(points, mode) {
  return points.map((point) => normalizePoint(point, mode));
}

function splitTrainTest(points, mode) {
  if (!Array.isArray(points) || points.length < 5) {
    return { train: points || [], test: [], testIndices: new Set() };
  }

  const train = [];
  const test = [];
  const testIndices = new Set();
  points.forEach((point, index) => {
    if (index % 5 === 0) {
      test.push(point);
      testIndices.add(index);
    } else {
      train.push(point);
    }
  });

  if (train.length < 2) return { train: points, test: [], testIndices: new Set() };
  if (mode === "logistic" && !hasBothClasses(train)) {
    return { train: points, test: [], testIndices: new Set() };
  }
  return { train, test, testIndices };
}

function buildLinearPreset(id = "linear_clear") {
  const points = [];
  const count = id === "linear_noisy" ? 34 : 26;
  const slope = id === "linear_outliers" ? 1.05 : 1.45;
  const intercept = id === "linear_outliers" ? -0.1 : 0.35;
  const noise = id === "linear_clear" ? 0.22 : 0.6;
  for (let i = 0; i < count; i += 1) {
    const x = randomBetween(-4.8, 4.8);
    const y = slope * x + intercept + randomBetween(-noise, noise);
    points.push({ x: clamp(x, -5, 5), y: clamp(y, -5, 5) });
  }
  if (id === "linear_outliers") {
    points.push({ x: -4.3, y: 4.7 });
    points.push({ x: 4.2, y: -4.6 });
  }
  return points;
}

function buildLogisticPreset(id = "logistic_circle") {
  const points = [];

  if (id === "logistic_linear") {
    for (let i = 0; i < 100; i += 1) {
      const x = randomBetween(-4.8, 4.8);
      const y = randomBetween(-4.8, 4.8);
      const margin = x * 0.75 + y * 0.55 + randomBetween(-1.1, 1.1);
      points.push({ x, y, label: margin > 0 ? 1 : 0 });
    }
    return points;
  }

  if (id === "logistic_xor") {
    for (let i = 0; i < 120; i += 1) {
      const x = randomBetween(-4.8, 4.8);
      const y = randomBetween(-4.8, 4.8);
      const label = (x > 0) !== (y > 0) ? 1 : 0;
      const noisyLabel = Math.random() < 0.08 ? (label ? 0 : 1) : label;
      points.push({ x, y, label: noisyLabel });
    }
    return points;
  }

  for (let i = 0; i < 120; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const radius = Math.sqrt(Math.random()) * 4.2;
    const x = radius * Math.cos(angle) + randomBetween(-0.22, 0.22);
    const y = radius * Math.sin(angle) + randomBetween(-0.22, 0.22);
    const label = radius < 2.2 ? 1 : 0;
    points.push({ x, y, label: Math.random() < 0.04 ? (label ? 0 : 1) : label });
  }
  return points;
}

function inferActionFromText(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

  if (/(linear|خطي|انحدار خطي)/.test(normalized)) {
    return { type: "change_model", params: { model: "linear" } };
  }
  if (/(logistic|لوجستي|تصنيف)/.test(normalized)) {
    return { type: "change_model", params: { model: "logistic" } };
  }
  if (/(mini|mini-batch|دفعه صغيره|مصغر)/.test(normalized)) {
    return { type: "set_algorithm", params: { algorithm: "mini_batch" } };
  }
  if (/(momentum|زخم)/.test(normalized)) {
    return { type: "set_algorithm", params: { algorithm: "momentum" } };
  }
  if (/(batch gd|batch|دفعة كاملة)/.test(normalized)) {
    return { type: "set_algorithm", params: { algorithm: "batch" } };
  }
  if (/(mse)/.test(normalized)) return { type: "set_loss", params: { loss: "mse" } };
  if (/(mae)/.test(normalized)) return { type: "set_loss", params: { loss: "mae" } };
  if (/(huber)/.test(normalized)) return { type: "set_loss", params: { loss: "huber" } };
  if (/(bce|cross|entropy|لوجستيك لوس)/.test(normalized)) return { type: "set_loss", params: { loss: "bce" } };
  if (/(focal)/.test(normalized)) return { type: "set_loss", params: { loss: "focal" } };
  if (/(clear|مسح|حذف النقاط)/.test(normalized)) {
    return { type: "clear_points", params: {} };
  }
  if (/(train|ابدا|شغل|ابدأ|start)/.test(normalized)) {
    return { type: "toggle_training", params: { run: true } };
  }
  if (/(pause|stop|ايقاف|توقف|وقف)/.test(normalized)) {
    return { type: "toggle_training", params: { run: false } };
  }
  if (/(circle|دائري|دائره)/.test(normalized)) {
    return { type: "add_preset", params: { preset: "logistic_circle" } };
  }
  if (/(xor|اكس اور)/.test(normalized)) {
    return { type: "add_preset", params: { preset: "logistic_xor" } };
  }
  if (/(poly|polynomial|many terms|higher order)/.test(normalized)) {
    return { type: "set_variant", params: { variant: "polynomial" } };
  }
  if (/(simple linear|straight line only)/.test(normalized)) {
    return { type: "set_variant", params: { variant: "linear" } };
  }
  const degreeMatch = normalized.match(/(?:degree|deg)\s*[:=]?\s*(\d{1,2})/);
  if (degreeMatch?.[1]) {
    const value = Number(degreeMatch[1]);
    if (Number.isFinite(value)) return { type: "set_degree", params: { value } };
  }
  const lrMatch = normalized.match(/(?:lr|learning rate|معدل التعلم)\s*[:=]?\s*([0-9]*\.?[0-9]+)/);
  if (lrMatch?.[1]) {
    const value = Number(lrMatch[1]);
    if (Number.isFinite(value)) return { type: "set_lr", params: { value } };
  }
  return null;
}

const INITIAL_CHAT = [
  {
    role: "assistant",
    text:
      "Regression Lab ready. Data editing does not auto-train. Press Start when you want learning to begin."
  }
];

function StatChip({ icon, label, value, color, warning = false }) {
  return (
    <div className={`reglab-stat-chip ${warning ? "warn" : ""}`} style={{ borderColor: color }}>
      <span className="reglab-stat-icon">{icon}</span>
      <span className="reglab-stat-label">{label}</span>
      <strong className="reglab-stat-value" style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

export default function RegressionLabRenderer() {
  const [mode, setMode] = useState("linear");
  const [linearVariant, setLinearVariant] = useState("linear");
  const [polynomialDegree, setPolynomialDegree] = useState(3);
  const [algorithm, setAlgorithm] = useState("batch");
  const [lossFunction, setLossFunction] = useState("mse");
  const [points, setPoints] = useState(() => buildLinearPreset("linear_clear"));
  const [learningRate, setLearningRate] = useState(0.01);
  const [stepsPerFrame, setStepsPerFrame] = useState(4);
  const [selectedClass, setSelectedClass] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState([]);
  const [testLossHistory, setTestLossHistory] = useState([]);
  const [renderTick, setRenderTick] = useState(0);
  const [canvasTool, setCanvasTool] = useState("add");
  const [chatVisible, setChatVisible] = useState(true);
  const [showRightStage, setShowRightStage] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT);
  const [dataDirty, setDataDirty] = useState(true);

  const modelRef = useRef(makeModel("linear"));
  const frameRef = useRef(0);
  const epochRef = useRef(0);
  const chatScrollRef = useRef(null);
  const modeVariantRef = useRef({ mode: "linear", linearVariant: "linear" });
  const modelKind = mode === "logistic" ? "logistic" : linearVariant;
  const split = useMemo(() => splitTrainTest(points, mode), [mode, points]);
  const trainingPoints = split.train;
  const testPoints = split.test;

  const classCounts = useMemo(() => {
    let class0 = 0;
    let class1 = 0;
    for (const point of points) {
      if (point.label === 1) class1 += 1;
      else class0 += 1;
    }
    return [class0, class1];
  }, [points]);

  const canTrain = useMemo(() => {
    if (trainingPoints.length < minPointsForMode(mode)) return false;
    if (mode === "logistic") return hasBothClasses(trainingPoints);
    return true;
  }, [mode, trainingPoints]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const variantChanged =
      modeVariantRef.current.mode !== mode || modeVariantRef.current.linearVariant !== linearVariant;
    const options = modelKind === "polynomial" ? { degree: polynomialDegree } : undefined;
    modelRef.current = makeModel(modelKind, options);
    modelRef.current.reset();
    setLossHistory([]);
    setTestLossHistory([]);
    setEpoch(0);
    epochRef.current = 0;
    setIsTraining(false);
    setDataDirty(true);
    setRenderTick((value) => value + 1);
    if (variantChanged) {
      setLearningRate(getDefaultLearningRate(mode, linearVariant));
      setLossFunction(getDefaultLoss(mode));
      setAlgorithm("batch");
    }
    setPoints((prev) => normalizePoints(prev, mode));
    modeVariantRef.current = { mode, linearVariant };
  }, [linearVariant, mode, modelKind, polynomialDegree]);

  useEffect(() => {
    const validLosses = getLossSet(mode);
    if (!validLosses.has(lossFunction)) {
      setLossFunction(getDefaultLoss(mode));
      return;
    }
    setIsTraining(false);
    setDataDirty(true);
  }, [lossFunction, mode]);

  useEffect(() => {
    setIsTraining(false);
    setDataDirty(true);
    setLossHistory([]);
    setTestLossHistory([]);
    setEpoch(0);
    epochRef.current = 0;
    setRenderTick((value) => value + 1);
  }, [points, algorithm]);

  useEffect(() => {
    if (!isTraining || !canTrain) return undefined;
    cancelAnimationFrame(frameRef.current);

    const loop = () => {
      const model = modelRef.current;
      const batchSize = Math.max(12, Math.round(trainingPoints.length * 0.35));
      let hasLoss = false;
      for (let i = 0; i < stepsPerFrame; i += 1) {
        const loss = model.step(trainingPoints, {
          lr: learningRate,
          algorithm,
          loss: lossFunction,
          batchSize
        });
        hasLoss = hasLoss || Number.isFinite(loss);
      }

      if (!hasLoss) {
        setIsTraining(false);
        return;
      }

      epochRef.current += stepsPerFrame;
      setEpoch(epochRef.current);
      const latestHistory = model.history.slice(-420);
      setLossHistory(latestHistory);
      let latestTest = null;
      if (testPoints.length > 0) {
        latestTest = model.computeLoss(testPoints, lossFunction);
        if (Number.isFinite(latestTest)) {
          setTestLossHistory((prev) => {
            const next = [...prev, latestTest];
            return next.length > 420 ? next.slice(next.length - 420) : next;
          });
        }
      }
      setRenderTick((value) => value + 1);

      const lastTrainLoss = latestHistory[latestHistory.length - 1];
      const refLoss = Number.isFinite(latestTest) ? latestTest : lastTrainLoss;
      const stopByLoss =
        Number.isFinite(refLoss) && refLoss <= getStopThreshold(mode, lossFunction, linearVariant);
      if (stopByLoss || epochRef.current >= 11000) {
        setIsTraining(false);
        return;
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [
    algorithm,
    canTrain,
    isTraining,
    learningRate,
    linearVariant,
    lossFunction,
    mode,
    stepsPerFrame,
    testPoints,
    trainingPoints
  ]);

  const applyPreset = (presetId) => {
    if (presetId.startsWith("linear")) {
      setMode("linear");
      setPoints(buildLinearPreset(presetId));
      return;
    }
    setMode("logistic");
    setPoints(buildLogisticPreset(presetId));
  };

  const handleAddPoint = (point) => {
    setPoints((prev) => [...prev, normalizePoint(point, mode)]);
  };

  const handleUpdatePoint = (index, nextPoint) => {
    setPoints((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = normalizePoint(nextPoint, mode);
      return next;
    });
  };

  const handleRemovePoint = (index) => {
    setPoints((prev) => prev.filter((_, pointIndex) => pointIndex !== index));
  };

  const handleResetModel = () => {
    modelRef.current.reset();
    setLossHistory([]);
    setTestLossHistory([]);
    setEpoch(0);
    epochRef.current = 0;
    setIsTraining(false);
    setDataDirty(true);
    setRenderTick((value) => value + 1);
  };

  const handleClearPoints = () => {
    setPoints([]);
    setLossHistory([]);
    setTestLossHistory([]);
    setEpoch(0);
    epochRef.current = 0;
    setIsTraining(false);
    setDataDirty(true);
  };

  const handleRandomData = () => {
    if (mode === "linear") {
      setPoints((prev) => [...prev, ...buildLinearPreset("linear_noisy").slice(0, 16)]);
      return;
    }
    setPoints((prev) => [...prev, ...buildLogisticPreset("logistic_linear").slice(0, 24)]);
  };

  const startTraining = () => {
    if (!canTrain) return;
    if (dataDirty) {
      modelRef.current.reset();
      setLossHistory([]);
      setTestLossHistory([]);
      setEpoch(0);
      epochRef.current = 0;
      setRenderTick((value) => value + 1);
    }
    setDataDirty(false);
    setIsTraining(true);
  };

  const applyAssistantAction = (action) => {
    if (!action || typeof action !== "object") return false;
    const type = String(action.type || "").toLowerCase();
    const params = action.params && typeof action.params === "object" ? action.params : {};

    if (type === "change_model") {
      const target = String(params.model || "").toLowerCase();
      if (target === "linear" || target === "logistic") {
        setMode(target);
        if (target === "linear" && linearVariant !== "linear") {
          setLinearVariant("linear");
        }
        return true;
      }
      return false;
    }

    if (type === "set_variant") {
      const variant = String(params.variant || "").toLowerCase();
      if (variant === "linear" || variant === "polynomial") {
        setMode("linear");
        setLinearVariant(variant);
        return true;
      }
      return false;
    }

    if (type === "set_degree") {
      const value = Number(params.value);
      if (!Number.isFinite(value)) return false;
      setMode("linear");
      setLinearVariant("polynomial");
      setPolynomialDegree(clamp(Math.round(value), 1, 10));
      return true;
    }

    if (type === "set_algorithm") {
      const next = String(params.algorithm || "").toLowerCase();
      if (next === "batch" || next === "mini_batch" || next === "momentum") {
        setAlgorithm(next);
        return true;
      }
      return false;
    }

    if (type === "set_loss") {
      const next = String(params.loss || "").toLowerCase();
      if (getLossSet(mode).has(next)) {
        setLossFunction(next);
        return true;
      }
      return false;
    }

    if (type === "set_lr") {
      const value = Number(params.value);
      if (!Number.isFinite(value)) return false;
      const max = mode === "linear" ? 0.05 : 0.2;
      setLearningRate(clamp(value, 0.001, max));
      return true;
    }

    if (type === "add_preset") {
      const preset = String(params.preset || "").toLowerCase();
      const valid = [
        "linear_clear",
        "linear_noisy",
        "linear_outliers",
        "logistic_circle",
        "logistic_xor",
        "logistic_linear"
      ];
      if (!valid.includes(preset)) return false;
      applyPreset(preset);
      return true;
    }

    if (type === "toggle_training") {
      const run = Object.prototype.hasOwnProperty.call(params, "run") ? Boolean(params.run) : !isTraining;
      if (run) startTraining();
      else setIsTraining(false);
      return true;
    }

    if (type === "clear_points") {
      handleClearPoints();
      return true;
    }

    if (type === "set_class") {
      const label = Number(params.label);
      if (label === 0 || label === 1) {
        setSelectedClass(label);
        return true;
      }
    }

    return false;
  };

  const sendMessage = async (overrideText) => {
    const text = String(overrideText ?? chatInput).trim();
    if (!text || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatInput("");
    setChatLoading(true);

    const fallbackAction = inferActionFromText(text);

    try {
      const response = await fetch("http://localhost:3002/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "regression_chat",
          message: text,
          context: {
            model: mode,
            variant: linearVariant,
            degree: polynomialDegree,
            algorithm,
            loss: lossFunction,
            points: points.length,
            lossValue: lossHistory.length ? lossHistory[lossHistory.length - 1] : null,
            trainLoss: lossHistory.length ? lossHistory[lossHistory.length - 1] : null,
            testLoss: testLossHistory.length ? testLossHistory[testLossHistory.length - 1] : null,
            epoch,
            learningRate
          }
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const applied = applyAssistantAction(data.action) || applyAssistantAction(fallbackAction);
      const base =
        typeof data.explanation === "string" && data.explanation.trim()
          ? data.explanation.trim()
          : applied
            ? "Command applied in Regression Lab."
            : "I could not parse the request.";
      setChatMessages((prev) => [...prev, { role: "assistant", text: base }]);
    } catch {
      const applied = applyAssistantAction(fallbackAction);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: applied
            ? "Applied locally. Start backend server on port 3002 for richer AI explanation."
            : "Server unavailable. Try: set algorithm momentum, set loss bce, set lr 0.03, start."
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const currentLoss = lossHistory.length ? lossHistory[lossHistory.length - 1] : null;
  const currentTestLoss = testLossHistory.length ? testLossHistory[testLossHistory.length - 1] : null;
  const isOverfitting =
    Number.isFinite(currentLoss) &&
    Number.isFinite(currentTestLoss) &&
    currentTestLoss > currentLoss * 2;

  const trainingHint = useMemo(() => {
    if (mode === "logistic" && !hasBothClasses(trainingPoints)) {
      return "Need both classes before training. Add class-0 and class-1 points.";
    }
    if (!canTrain) return "Add more points first.";
    if (dataDirty) return "Data changed. Press Start to run training.";
    if (isTraining) return "Training in progress...";
    if (currentLoss === null) return "Model ready. Press Start.";
    if (isOverfitting) return "Overfitting warning: test loss is much higher than train loss.";
    if (currentLoss > (mode === "linear" ? 1.2 : 0.9)) {
      return "High loss. Try another algorithm or a different loss function.";
    }
    return "Fit looks stable. You can refine data and train again.";
  }, [canTrain, currentLoss, dataDirty, isOverfitting, isTraining, mode, trainingPoints]);

  const applyManualLinearParameter = (field, value) => {
    if (mode !== "linear" || linearVariant !== "linear") return;
    const model = modelRef.current;
    if (!model || typeof model.predict !== "function") return;

    const safeValue = clamp(Number(value), -5, 5);
    if (field === "w") model.w = safeValue;
    if (field === "b") model.b = safeValue;
    model.vW = 0;
    model.vB = 0;

    const trainLoss = trainingPoints.length ? model.computeLoss(trainingPoints, lossFunction) : null;
    const testLoss = testPoints.length ? model.computeLoss(testPoints, lossFunction) : null;

    if (Number.isFinite(trainLoss)) {
      setLossHistory((prev) => [...prev, trainLoss].slice(-420));
    }
    if (Number.isFinite(testLoss)) {
      setTestLossHistory((prev) => [...prev, testLoss].slice(-420));
    }

    setIsTraining(false);
    setDataDirty(true);
    setRenderTick((tick) => tick + 1);
  };

  return (
    <div className={`reglab-shell ${isFullscreen ? "is-fullscreen" : ""}`}>
      <motion.header
        className="reglab-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h3>Regression Studio</h3>
          <p>Interactive fitting lab for linear and logistic models.</p>
        </div>
        <div className="reglab-header-badges">
          <StatChip
            icon={<BrainCircuit size={13} />}
            label="Model"
            value={
              mode === "linear"
                ? linearVariant === "polynomial"
                  ? `Poly d=${polynomialDegree}`
                  : "Linear"
                : "Logistic"
            }
            color="#38bdf8"
          />
          <StatChip icon={<Binary size={13} />} label="Algorithm" value={algorithm} color="#7dd3fc" />
          <StatChip icon={<Activity size={13} />} label="Loss" value={lossFunction} color="#a5b4fc" />
          <StatChip icon={<Timer size={13} />} label="Epoch" value={epoch} color="#3b82f6" />
          <StatChip
            icon={<Activity size={13} />}
            label="Train"
            value={currentLoss !== null ? currentLoss.toFixed(4) : "--"}
            color="#10b981"
          />
          <StatChip
            icon={<Binary size={13} />}
            label="Test"
            value={currentTestLoss !== null ? currentTestLoss.toFixed(4) : "--"}
            color={isOverfitting ? "#ef4444" : "#10b981"}
            warning={isOverfitting}
          />
        </div>
        <div className="reglab-header-actions">
          <button type="button" onClick={() => setShowRightStage((value) => !value)}>
            {showRightStage ? "Hide Right Screen" : "Show Right Screen"}
          </button>
          <button type="button" onClick={() => setIsFullscreen((value) => !value)}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </motion.header>

      <div className="reglab-main">
        <aside className="reglab-left">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <LearningVisualizer
              mode={mode}
              linearVariant={linearVariant}
              model={modelRef.current}
              history={lossHistory}
              testHistory={testLossHistory}
              epoch={epoch}
              pointsCount={points.length}
              trainCount={trainingPoints.length}
              testCount={testPoints.length}
              algorithm={algorithm}
              lossFunction={lossFunction}
              isOverfitting={isOverfitting}
              canManualTune={mode === "linear" && linearVariant === "linear"}
              manualW={Number.isFinite(modelRef.current?.w) ? modelRef.current.w : 0}
              manualB={Number.isFinite(modelRef.current?.b) ? modelRef.current.b : 0}
              onManualWChange={(value) => applyManualLinearParameter("w", value)}
              onManualBChange={(value) => applyManualLinearParameter("b", value)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
          >
            <LossLandscape3D
              enabled={mode === "linear" && linearVariant === "linear"}
              points={trainingPoints}
              model={modelRef.current}
              trainLoss={currentLoss}
              testLoss={currentTestLoss}
            />
          </motion.div>

          {chatVisible && (
            <motion.section
              className="reglab-panel reglab-chat"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.18 }}
            >
              <div className="reglab-chat-header">
                <strong>Regression AI Chat</strong>
                <span>Ready</span>
              </div>
              <div className="reglab-chat-log" ref={chatScrollRef}>
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`reglab-msg ${message.role}`}>
                    {message.text}
                  </div>
                ))}
                {chatLoading && <div className="reglab-msg assistant">Thinking...</div>}
              </div>
              <div className="reglab-chat-quick">
                <button type="button" onClick={() => sendMessage("switch logistic")}>
                  Logistic
                </button>
                <button type="button" onClick={() => sendMessage("set algorithm momentum")}>
                  Momentum
                </button>
                <button type="button" onClick={() => sendMessage("set loss bce")}>
                  BCE
                </button>
              </div>
              <div className="reglab-chat-input">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendMessage();
                  }}
                  placeholder="Try: set algorithm mini_batch, set loss focal, start"
                />
                <button type="button" onClick={() => sendMessage()}>
                  Send
                </button>
              </div>
            </motion.section>
          )}
        </aside>

        <section className={`reglab-center ${showRightStage ? "show-stage" : "hide-stage"}`}>
          {showRightStage ? (
            <motion.section
              className="reglab-panel reglab-stage"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <InteractiveCanvas
                mode={mode}
                points={points}
                model={modelRef.current}
                selectedClass={selectedClass}
                tool={canvasTool}
                onToolChange={setCanvasTool}
                onSelectedClassChange={setSelectedClass}
                testPointIndices={split.testIndices}
                renderTick={renderTick}
                onAddPoint={handleAddPoint}
                onUpdatePoint={handleUpdatePoint}
                onRemovePoint={handleRemovePoint}
              />
              <div className="reglab-hint">{trainingHint}</div>
            </motion.section>
          ) : (
            <div className="reglab-stage-hidden-note">Right screen hidden. Use header button to show it again.</div>
          )}
        </section>

        <aside className="reglab-right">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
          >
            <ModelControls
              mode={mode}
              linearVariant={linearVariant}
              polynomialDegree={polynomialDegree}
              algorithm={algorithm}
              lossFunction={lossFunction}
              learningRate={learningRate}
              stepsPerFrame={stepsPerFrame}
              isTraining={isTraining}
              canTrain={canTrain}
              epoch={epoch}
              pointsCount={points.length}
              classCounts={classCounts}
              selectedClass={selectedClass}
              onModeChange={setMode}
              onLinearVariantChange={setLinearVariant}
              onPolynomialDegreeChange={setPolynomialDegree}
              onAlgorithmChange={setAlgorithm}
              onLossChange={setLossFunction}
              onLearningRateChange={setLearningRate}
              onStepsChange={setStepsPerFrame}
              onToggleTraining={() => {
                if (isTraining) {
                  setIsTraining(false);
                } else {
                  startTraining();
                }
              }}
              onResetModel={handleResetModel}
              onClearPoints={handleClearPoints}
              onApplyPreset={applyPreset}
              onGenerateRandom={handleRandomData}
              onSelectedClassChange={setSelectedClass}
              onToggleChat={() => setChatVisible((value) => !value)}
            />
          </motion.div>
        </aside>
      </div>
    </div>
  );
}


