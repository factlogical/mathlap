import React, { useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Download,
  Pause,
  Play,
  RotateCcw,
  SendHorizontal,
  Share2,
  SlidersHorizontal,
  Target,
  X
} from 'lucide-react';
import NeuralNetwork from '../utils/NeuralEngine';

const PRESETS = [
  {
    id: 'shallow',
    name: 'Shallow Network',
    description: 'Fast learner for simple problems',
    icon: '⚡',
    architecture: [2, 4, 1]
  },
  {
    id: 'deep',
    name: 'Deep Network',
    description: 'Better for complex patterns',
    icon: '🏔️',
    architecture: [2, 8, 8, 1]
  },
  {
    id: 'wide',
    name: 'Wide Network',
    description: 'More capacity in one layer',
    icon: '↔️',
    architecture: [2, 16, 1]
  }
];

const DATASETS = [
  { id: 'xor', name: 'XOR Problem', icon: '❌', difficulty: 'Medium' },
  { id: 'circle', name: 'Circle', icon: '⭕', difficulty: 'Easy' },
  { id: 'spiral', name: 'Spiral', icon: '🌀', difficulty: 'Hard' },
  { id: 'linear', name: 'Linear', icon: '➖', difficulty: 'Easy' }
];

const MODE_OPTIONS = [
  { id: 'neural', label: 'Neural' },
  { id: 'symbolic', label: 'Symbolic Logic' }
];

const LOGIC_GATES = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'IMPLIES'];
const OPTIMIZER_OPTIONS = [
  {
    id: 'momentum',
    name: 'Momentum',
    note: 'Smoother updates, faster convergence on noisy data'
  },
  {
    id: 'sgd',
    name: 'SGD',
    note: 'Direct gradient steps, easier to observe step-by-step changes'
  }
];

const NeuralPlayground = () => {
  const [mode, setMode] = useState('neural');
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [layers, setLayers] = useState(2);
  const [neurons, setNeurons] = useState(8);
  const [architecture, setArchitecture] = useState(PRESETS[0].architecture);
  const [dataset, setDataset] = useState('xor');
  const [points, setPoints] = useState(() => generateDataset('xor'));
  const [isTraining, setIsTraining] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [trainingStep, setTrainingStep] = useState(0);
  const [lossHistory, setLossHistory] = useState(() => seedLossHistory());
  const [metrics, setMetrics] = useState(() => ({
    loss: 0.82,
    accuracy: 0.52,
    epoch: 0
  }));
  const [boundaryTick, setBoundaryTick] = useState(0);
  const [hoveredNeuron, setHoveredNeuron] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedNeuron, setSelectedNeuron] = useState(null);
  const [deepDiveTab, setDeepDiveTab] = useState('impact');
  const [viewMode, setViewMode] = useState('visual');
  const [learningRate, setLearningRate] = useState(0.08);
  const [optimizer, setOptimizer] = useState('momentum');
  const [optimizerStats, setOptimizerStats] = useState({
    gradNorm: 0,
    updateNorm: 0,
    samples: 0
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(() => ([
    {
      role: 'assistant',
      text:
        'Smart Training Assistant جاهز. جرّب: "set optimizer to sgd" أو "start training" أو "set lr 0.04" أو "status".'
    }
  ]));
  const [highlightedEdge, setHighlightedEdge] = useState(null);
  const [copilotState, setCopilotState] = useState({
    visible: false,
    type: 'idle',
    message: '',
    detail: ''
  });
  const isSymbolic = mode === 'symbolic';
  const networkRef = useRef(null);
  const copilotStateRef = useRef(copilotState);
  const copilotCooldownRef = useRef(0);
  const chatScrollRef = useRef(null);
  const stabilityRef = useRef({
    lastLoss: null,
    lastDelta: 0,
    oscillations: 0,
    stagnant: 0,
    bestLoss: Infinity,
    lastAdjustStep: 0
  });

  const customArchitecture = useMemo(() => {
    return [2, ...Array(layers).fill(neurons), 1];
  }, [layers, neurons]);

  const delayMs = useMemo(() => mapSpeedToDelay(speed), [speed]);

  const grid = useMemo(() => {
    const size = viewMode === 'math'
      ? 24
      : isTraining
        ? speed >= 3
          ? 26
          : 32
        : 42;
    const x = Array.from({ length: size }, (_, i) => -1.2 + (2.4 * i) / (size - 1));
    const y = Array.from({ length: size }, (_, i) => -1.2 + (2.4 * i) / (size - 1));
    return { x, y };
  }, [viewMode, isTraining, speed]);

  const contourZ = useMemo(() => {
    if (viewMode !== 'visual') {
      return [];
    }
    if (mode !== 'neural' || !networkRef.current) {
      return grid.y.map((y) =>
        grid.x.map((x) => predictBoundary(x, y, dataset, trainingStep))
      );
    }
    const net = networkRef.current;
    return grid.y.map((y) =>
      grid.x.map((x) => {
        const output = net.predict([x, y]);
        return output[0] ?? 0;
      })
    );
  }, [viewMode, grid.x, grid.y, dataset, trainingStep, mode, boundaryTick]);

  useEffect(() => {
    setPoints(generateDataset(dataset));
    setIsTraining(false);
    initializeNetwork();
  }, [dataset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
    return () => clearTimeout(timer);
  }, [isTraining]);

  useEffect(() => {
    initializeNetwork();
  }, [architecture, mode]);

  useEffect(() => {
    setSelectedNeuron(null);
  }, [architecture, mode, dataset]);

  useEffect(() => {
    if (viewMode !== 'math') {
      setHighlightedEdge(null);
    }
  }, [viewMode]);

  useEffect(() => {
    copilotStateRef.current = copilotState;
  }, [copilotState]);

  useEffect(() => {
    if (!isTraining && copilotState.visible) {
      setCopilotState({ visible: false, type: 'idle', message: '', detail: '' });
    }
  }, [isTraining, copilotState.visible]);

  useEffect(() => {
    if (networkRef.current) {
      networkRef.current.learningRate = learningRate;
    }
  }, [learningRate]);

  useEffect(() => {
    if (networkRef.current?.setOptimizer) {
      networkRef.current.setOptimizer(optimizer);
    }
  }, [optimizer]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!isTraining || mode !== 'neural') return;
    let rafId;
    let lastEpoch = 0;
    let lastFrameTime = 0;
    let uiCounter = 0;

    const trainStep = (timestamp) => {
      const net = networkRef.current;
      if (!net) return;
      if (delayMs > 0 && timestamp - lastFrameTime < delayMs) {
        rafId = requestAnimationFrame(trainStep);
        return;
      }
      lastFrameTime = timestamp;

      const steps = 1;
      const batchSize = Math.max(8, Math.round(16));
      let lossSum = 0;
      let correct = 0;
      let seen = 0;
      let gradNormSum = 0;
      let updateNormSum = 0;

      for (let s = 0; s < steps; s += 1) {
        for (let b = 0; b < batchSize; b += 1) {
          const sample = points[Math.floor(Math.random() * points.length)];
          if (!sample) continue;
          const output = net.forward([sample.x, sample.y], true);
          const prediction = output[0] ?? 0;
          lossSum += net.loss(prediction, sample.label);
          correct += (prediction >= 0.5 ? 1 : 0) === sample.label ? 1 : 0;
          seen += 1;
          const updateInfo = net.backward([sample.label]);
          if (updateInfo) {
            gradNormSum += updateInfo.gradNorm || 0;
            updateNormSum += updateInfo.updateNorm || 0;
          }
        }
      }

      if (seen > 0) {
        const loss = lossSum / seen;
        const accuracy = correct / seen;
        lastEpoch += steps;
        const nextEpoch = lastEpoch;
        const stability = stabilityRef.current;
        if (stability.lastLoss !== null) {
          const delta = loss - stability.lastLoss;
          const sign = Math.sign(delta);
          const lastSign = Math.sign(stability.lastDelta);
          if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
            stability.oscillations += 1;
          } else {
            stability.oscillations = 0;
          }
          stability.lastDelta = delta;
          if (loss < stability.bestLoss - 0.001) {
            stability.bestLoss = loss;
            stability.stagnant = 0;
          } else {
            stability.stagnant += 1;
          }
        } else {
          stability.bestLoss = loss;
        }
        stability.lastLoss = loss;

        const unstable = stability.oscillations >= 5 || stability.stagnant >= 5;
        if (
          unstable &&
          nextEpoch - stability.lastAdjustStep >= 5 &&
          networkRef.current?.adjustLearningRate
        ) {
          const nextRate = networkRef.current.adjustLearningRate(0.9);
          setLearningRate(nextRate);
          networkRef.current.resetMomentum?.();
          stability.lastAdjustStep = nextEpoch;
          stability.oscillations = 0;
          stability.stagnant = 0;
        }

        if (loss < 0.02 && stability.stagnant >= 8) {
          setCopilotState({
            visible: true,
            type: 'success',
            message: 'Training converged. Auto-stopped.',
            detail: `Final loss ${loss.toFixed(3)}.`
          });
          setIsTraining(false);
          return;
        }

        const now = Date.now();
        if (unstable) {
          if (now >= copilotCooldownRef.current || !copilotStateRef.current.visible) {
            setCopilotState({
              visible: true,
              type: 'alert',
              message: 'Loss is unstable. The learning rate might be too high.',
              detail: ''
            });
            copilotCooldownRef.current = now + 4000;
          }
        } else if (copilotStateRef.current.visible && now >= copilotCooldownRef.current) {
          setCopilotState({ visible: false, type: 'idle', message: '', detail: '' });
        }

        const uiStride = speed >= 4 ? 5 : speed >= 3 ? 4 : speed >= 2 ? 3 : 2;
        const boundaryStride = uiStride * 2;
        const shouldUpdateUI = uiCounter % uiStride === 0;
        uiCounter += 1;
        if (shouldUpdateUI) {
          setTrainingStep((prev) => prev + steps);
          setMetrics({ loss, accuracy, epoch: lastEpoch });
          setLossHistory((prev) => [...prev.slice(-100), loss]);
          setOptimizerStats({
            gradNorm: seen > 0 ? gradNormSum / seen : 0,
            updateNorm: seen > 0 ? updateNormSum / seen : 0,
            samples: seen
          });
          if (uiCounter % boundaryStride === 0) {
            setBoundaryTick((prev) => prev + 1);
          }
        }
      }

      rafId = requestAnimationFrame(trainStep);
    };

    rafId = requestAnimationFrame(trainStep);
    return () => cancelAnimationFrame(rafId);
  }, [isTraining, speed, points, mode, delayMs]);

  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setArchitecture(preset.architecture);
    const hidden = preset.architecture.slice(1, -1);
    setLayers(hidden.length);
    setNeurons(hidden[0] || neurons);
  };

  const applyArchitecture = () => {
    setSelectedPreset('custom');
    setArchitecture(customArchitecture);
  };

  const resetTraining = () => {
    setIsTraining(false);
    initializeNetwork();
  };

  const handleBoundaryClick = (event) => {
    const point = event?.points?.[0];
    if (!point) return;
    let label = predictBoundary(point.x, point.y, dataset, trainingStep) > 0.5 ? 1 : 0;
    if (mode === 'neural' && networkRef.current) {
      const output = networkRef.current.predict([point.x, point.y])[0] ?? 0;
      label = output > 0.5 ? 1 : 0;
    }
    setPoints((prev) => [...prev, { x: point.x, y: point.y, label }]);
  };

  const handleNeuronClick = (neuron) => {
    setSelectedNeuron(neuron);
    setDeepDiveTab('impact');
  };

  const handleAutoFix = () => {
    if (networkRef.current?.adjustLearningRate) {
      const currentRate = networkRef.current.learningRate;
      const nextRate = networkRef.current.adjustLearningRate(0.6);
      setLearningRate(nextRate);
      networkRef.current.resetMomentum?.();
      stabilityRef.current = {
        lastLoss: null,
        lastDelta: 0,
        oscillations: 0,
        stagnant: 0,
        bestLoss: Infinity,
        lastAdjustStep: trainingStep
      };
      const detail = `Reduced LR from ${currentRate.toFixed(3)} to ${nextRate.toFixed(3)}.`;
      setCopilotState({
        visible: true,
        type: 'success',
        message: "I've adjusted the parameters. Watch the convergence now.",
        detail
      });
      copilotCooldownRef.current = Date.now() + 4000;
      return;
    }
    stabilityRef.current = {
      lastLoss: null,
      lastDelta: 0,
      oscillations: 0,
      stagnant: 0,
      bestLoss: Infinity,
      lastAdjustStep: trainingStep
    };
    setCopilotState({
      visible: true,
      type: 'success',
      message: "I've adjusted the parameters. Watch the convergence now.",
      detail: ''
    });
    copilotCooldownRef.current = Date.now() + 4000;
  };

  const resolveDatasetFromText = (lowerText) => {
    if (
      lowerText.includes('xor') ||
      lowerText.includes('اكس اور') ||
      lowerText.includes('exclusive')
    ) {
      return 'xor';
    }
    if (
      lowerText.includes('circle') ||
      lowerText.includes('دائرة')
    ) {
      return 'circle';
    }
    if (
      lowerText.includes('spiral') ||
      lowerText.includes('حلزون')
    ) {
      return 'spiral';
    }
    if (
      lowerText.includes('linear') ||
      lowerText.includes('خطي')
    ) {
      return 'linear';
    }
    return null;
  };

  const handleAssistantCommand = (text) => {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('start') ||
      lowerText.includes('run') ||
      lowerText.includes('resume') ||
      lowerText.includes('ابد') ||
      lowerText.includes('شغل')
    ) {
      if (mode !== 'neural') {
        setMode('neural');
      }
      setIsTraining(true);
      return `Training started with ${optimizer.toUpperCase()} at LR ${learningRate.toFixed(3)}.`;
    }

    if (
      lowerText.includes('pause') ||
      lowerText.includes('stop') ||
      lowerText.includes('ايقاف') ||
      lowerText.includes('وقف')
    ) {
      setIsTraining(false);
      return 'Training paused. Ask for "status" to inspect current metrics.';
    }

    if (
      lowerText.includes('momentum') ||
      lowerText.includes('زخم')
    ) {
      setOptimizer('momentum');
      return 'Optimizer switched to Momentum. Updates now accumulate velocity to smooth noisy gradients.';
    }

    if (lowerText.includes('sgd')) {
      setOptimizer('sgd');
      return 'Optimizer switched to SGD. You will now see direct gradient steps with less smoothing.';
    }

    const datasetMatch = resolveDatasetFromText(lowerText);
    if (datasetMatch) {
      setDataset(datasetMatch);
      return `Dataset changed to ${datasetMatch}. The network will reinitialize with noisier samples.`;
    }

    const lrMatch = lowerText.match(
      /(?:lr|learning rate|معدل التعلم|تعلم)\s*[:=]?\s*([0-9]*\.?[0-9]+)/i
    );
    if (lrMatch?.[1]) {
      const nextRate = clamp(parseFloat(lrMatch[1]), 0.001, 1);
      if (Number.isFinite(nextRate)) {
        setLearningRate(nextRate);
        return `Learning rate updated to ${nextRate.toFixed(3)}.`;
      }
    }

    if (
      lowerText.includes('status') ||
      lowerText.includes('حالة') ||
      lowerText.includes('metrics') ||
      lowerText.includes('report')
    ) {
      return `Status: loss=${metrics.loss.toFixed(4)}, accuracy=${(metrics.accuracy * 100).toFixed(
        1
      )}%, epoch=${metrics.epoch}, optimizer=${optimizer.toUpperCase()}, gradNorm=${optimizerStats.gradNorm.toFixed(
        4
      )}, updateNorm=${optimizerStats.updateNorm.toFixed(4)}.`;
    }

    if (
      lowerText.includes('difference') ||
      lowerText.includes('فرق') ||
      lowerText.includes('explain optimizer') ||
      lowerText.includes('خوارزم')
    ) {
      return 'Momentum keeps a velocity memory and usually converges faster on noisy data, while SGD takes direct steps that are easier to inspect but often less stable.';
    }

    return 'Commands: start/pause training, set optimizer to SGD or Momentum, change dataset (xor/circle/spiral/linear), set LR (example: lr 0.04), or ask for status.';
  };

  const handleChatSubmit = (overrideText) => {
    const nextText = (overrideText ?? chatInput).trim();
    if (!nextText) return;
    const assistantReply = handleAssistantCommand(nextText);
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', text: nextText },
      { role: 'assistant', text: assistantReply }
    ]);
    setChatInput('');
  };

  const initializeNetwork = () => {
    stabilityRef.current = {
      lastLoss: null,
      lastDelta: 0,
      oscillations: 0,
      stagnant: 0,
      bestLoss: Infinity,
      lastAdjustStep: 0
    };
    setCopilotState({ visible: false, type: 'idle', message: '' });
    if (mode !== 'neural') {
      setTrainingStep(0);
      setLossHistory(seedLossHistory());
      setMetrics({ loss: 0.82, accuracy: 0.52, epoch: 0 });
      setOptimizerStats({ gradNorm: 0, updateNorm: 0, samples: 0 });
      return;
    }
    networkRef.current = new NeuralNetwork(architecture, {
      learningRate,
      hiddenActivation: 'tanh',
      optimizer
    });
    setTrainingStep(0);
    setLossHistory([]);
    setMetrics({ loss: 1, accuracy: 0, epoch: 0 });
    setOptimizerStats({ gradNorm: 0, updateNorm: 0, samples: 0 });
    setBoundaryTick((prev) => prev + 1);
  };

  const handleNeuronHover = (neuron, event) => {
    setHoveredNeuron(neuron);
    setTooltipPos({ x: event.clientX, y: event.clientY });
  };

  const handleNeuronLeave = () => {
    setHoveredNeuron(null);
  };

  const handlePointerMove = (event) => {
    if (!hoveredNeuron) return;
    setTooltipPos({ x: event.clientX, y: event.clientY });
  };

  return (
    <div className="neural-shell" dir="rtl">
      <header className="neural-header">
        <h1 className="neural-title">Neural Lab</h1>
        <div className="neural-mode-toggle">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`neural-mode-btn ${mode === option.id ? 'active' : ''}`}
              onClick={() => setMode(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="neural-view-toggle">
          <button
            type="button"
            className={`neural-view-btn ${viewMode === 'visual' ? 'active' : ''}`}
            onClick={() => setViewMode('visual')}
          >
            Visual View
          </button>
          <button
            type="button"
            className={`neural-view-btn ${viewMode === 'math' ? 'active' : ''}`}
            onClick={() => setViewMode('math')}
          >
            Math View
          </button>
        </div>
        <div className="neural-header-spacer" />
        <div className="neural-header-actions">
          <button className="neural-icon-btn" type="button">
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button className="neural-icon-btn" type="button">
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </header>

      <div className="neural-grid">
        <aside className="neural-panel neural-controls">
          <section className="neural-section">
            <div className="neural-section-header">
              <h3>Presets</h3>
              <span className="neural-tag">Architecture</span>
            </div>
            <div className="neural-stack">
              {PRESETS.map((preset) => (
                <PresetButton
                  key={preset.id}
                  preset={preset}
                  isActive={selectedPreset === preset.id}
                  onClick={() => applyPreset(preset)}
                />
              ))}
            </div>
          </section>

          <section className="neural-section neural-custom">
            <div className="neural-section-header">
              <h3>Custom Architecture</h3>
              <SlidersHorizontal className="h-4 w-4 text-indigo-300" />
            </div>

            <div className="neural-slider-block">
              <div className="neural-slider-label">
                <span>Hidden Layers</span>
                <motion.span
                  key={layers}
                  initial={{ scale: 1.2, color: '#a855f7' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="neural-mono neural-value"
                >
                  {layers}
                </motion.span>
              </div>
              <div className="neural-slider-wrap">
                <input
                  type="range"
                  min="1"
                  max="3"
                  value={layers}
                  onChange={(e) => setLayers(parseInt(e.target.value, 10))}
                  className="neural-slider"
                />
                <motion.div
                  animate={{ left: `${((layers - 1) / 2) * 100}%` }}
                  className="neural-slider-bubble"
                >
                  {layers}
                </motion.div>
              </div>
            </div>

            <div className="neural-slider-block">
              <div className="neural-slider-label">
                <span>Neurons / Layer</span>
                <motion.span
                  key={neurons}
                  initial={{ scale: 1.2, color: '#a855f7' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="neural-mono neural-value"
                >
                  {neurons}
                </motion.span>
              </div>
              <input
                type="range"
                min="2"
                max="16"
                value={neurons}
                onChange={(e) => setNeurons(parseInt(e.target.value, 10))}
                className="neural-slider"
              />
            </div>

            <div className="neural-architecture-preview" dir="ltr">
              <span className="neural-chip">[2]</span>
              {Array(layers)
                .fill(neurons)
                .map((n, idx) => (
                  <React.Fragment key={`${n}-${idx}`}>
                    <ArrowRight className="h-4 w-4 text-white/40" />
                    <span className="neural-chip neural-chip--accent">[{n}]</span>
                  </React.Fragment>
                ))}
              <ArrowRight className="h-4 w-4 text-white/40" />
              <span className="neural-chip neural-chip--output">[1]</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={applyArchitecture}
              className="neural-apply-btn"
              type="button"
            >
              <Check className="h-5 w-5" />
              Apply Architecture
            </motion.button>
          </section>

          <section className="neural-section">
            <div className="neural-section-header">
              <h3>Dataset</h3>
              <span className="neural-tag">Problem Space</span>
            </div>
            <div className="neural-stack">
              {DATASETS.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDataset(item.id)}
                  className={`neural-dataset ${dataset === item.id ? 'active' : ''}`}
                  type="button"
                >
                  <div className="neural-dataset-info">
                    <span className="neural-dataset-icon">{item.icon}</span>
                    <div>
                      <p className="neural-dataset-name">{item.name}</p>
                      <p className="neural-dataset-level">{item.difficulty}</p>
                    </div>
                  </div>
                  {dataset === item.id && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  )}
                </motion.button>
              ))}
            </div>
          </section>
        </aside>

        <section className="neural-panel neural-visual">
          <div className="neural-section-header">
            <div className="neural-section-title">
              <h3>Network Visualization</h3>
              <span className="neural-tag">Preview</span>
            </div>
          </div>
          <div className="neural-visual-body">
            {viewMode === 'math' ? (
              <MathDerivationView
                network={networkRef.current}
                architecture={architecture}
                trainingStep={trainingStep}
                learningRate={learningRate}
                mode={mode}
                highlightedEdge={highlightedEdge}
                onWeightHover={setHighlightedEdge}
                onWeightLeave={() => setHighlightedEdge(null)}
              />
            ) : (
              <>
                <NetworkGraph
                  architecture={architecture}
                  isTraining={isTraining}
                  trainingStep={trainingStep}
                  speed={speed}
                  mode={mode}
                  onNeuronHover={handleNeuronHover}
                  onNeuronLeave={handleNeuronLeave}
                  onPointerMove={handlePointerMove}
                  onNeuronClick={handleNeuronClick}
                  highlightedEdge={highlightedEdge}
                />
                <div className="neural-math-hint">
                  Math Inspector: hover a neuron to inspect activation and local behavior.
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="neural-panel neural-problem">
          <div className="neural-card neural-card--boundary">
            <div className="neural-section-header neural-section-header--split">
              <div className="neural-section-title">
                <h3>
                  {viewMode === 'math'
                    ? mode === 'symbolic'
                      ? 'Truth Table'
                      : 'Loss Landscape'
                    : 'Decision Boundary'}
                </h3>
                <Target className="h-4 w-4 text-indigo-300" />
              </div>
              {viewMode !== 'math' && (
                <div className="neural-dataset-toolbar">
                  {['spiral', 'circle', 'xor'].map((id) => {
                    const item = DATASETS.find((entry) => entry.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`neural-dataset-btn ${dataset === id ? 'active' : ''}`}
                        onClick={() => setDataset(id)}
                        title={item?.name}
                      >
                        <span>{item?.icon}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {viewMode === 'math' ? (
              mode === 'symbolic' ? (
                <TruthTable gate="XOR" />
              ) : (
                <LossLandscape3D loss={metrics.loss} trainingStep={trainingStep} />
              )
            ) : (
              <DecisionBoundaryPlot
                grid={grid}
                z={contourZ}
                points={points}
                onClick={handleBoundaryClick}
              />
            )}
          </div>

          <div className="neural-card neural-card--training">
            <div className="neural-section-header">
              <h3>Training</h3>
              <span className="neural-tag">Controls</span>
            </div>
            <div className="neural-training">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`neural-train-btn ${isTraining ? 'pause' : 'play'}`}
                onClick={() => setIsTraining((prev) => !prev)}
                type="button"
              >
                {isTraining ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause Training
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Start Training
                  </>
                )}
              </motion.button>
              <button className="neural-reset-btn" type="button" onClick={resetTraining}>
                <RotateCcw className="h-4 w-4" />
                Reset Network
              </button>
              <div className="neural-speed">
                <div>
                  <span>Speed</span>
                  <span className="neural-mono">{Math.round(delayMs)}ms</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="neural-slider"
                />
              </div>
              <div className={`neural-lr ${copilotState.type === 'alert' ? '[!]' : '[OK]'}`}>
                <div>
                  <span>Learning Rate</span>
                  <span className="neural-mono">{learningRate.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="neural-slider"
                />
              </div>

              <div className="neural-optimizer">
                <div className="neural-optimizer-header">
                  <span>Training Algorithm</span>
                  <span className="neural-mono">{optimizer.toUpperCase()}</span>
                </div>
                <div className="neural-optimizer-grid">
                  {OPTIMIZER_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`neural-optimizer-btn ${optimizer === item.id ? 'active' : ''}`}
                      onClick={() => setOptimizer(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.note}</span>
                    </button>
                  ))}
                </div>
                <div className="neural-optimizer-stats">
                  <p>
                    Grad norm: <span className="neural-mono">{optimizerStats.gradNorm.toFixed(4)}</span>
                  </p>
                  <p>
                    Update norm: <span className="neural-mono">{optimizerStats.updateNorm.toFixed(4)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="neural-card neural-card--chat">
            <div className="neural-section-header">
              <h3>Smart Chat</h3>
              <span className="neural-tag">Assistant</span>
            </div>
            <div className="neural-chat-log" ref={chatScrollRef}>
              {chatMessages.map((message, idx) => (
                <div
                  key={`chat-${idx}`}
                  className={`neural-chat-msg ${message.role === 'assistant' ? 'assistant' : 'user'}`}
                >
                  {message.role === 'assistant' && <Bot className="h-4 w-4" />}
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            <div className="neural-chat-actions">
              <button type="button" onClick={() => handleChatSubmit('status')}>
                Status
              </button>
              <button type="button" onClick={() => handleChatSubmit('set optimizer to sgd')}>
                Use SGD
              </button>
              <button type="button" onClick={() => handleChatSubmit('set optimizer to momentum')}>
                Use Momentum
              </button>
            </div>
            <div className="neural-chat-input">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleChatSubmit();
                  }
                }}
                placeholder="Ask to change optimizer, LR, dataset, or training status"
              />
              <button type="button" onClick={() => handleChatSubmit()}>
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <section className="neural-panel neural-loss">
        <div className="neural-section-header">
          <h3>Loss Over Time</h3>
          <BarChart3 className="h-4 w-4 text-blue-300" />
        </div>
        <div className="neural-loss-body">
          <LossChart lossHistory={lossHistory} />
          <div className="neural-loss-metrics">
            <div>
              <p>Loss</p>
              <span className="neural-mono">{metrics.loss.toFixed(4)}</span>
            </div>
            <div>
              <p>Accuracy</p>
              <span className="neural-mono">{(metrics.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div>
              <p>Epoch</p>
              <span className="neural-mono">{metrics.epoch}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="neural-footer">
        Current architecture: <span className="neural-mono">{architecture.join(' -> ')}</span>
        <span className="neural-mono"> | Mode: {isSymbolic ? 'Symbolic Logic' : 'Neural'}</span>
        <span className="neural-mono"> | Optimizer: {optimizer.toUpperCase()}</span>
      </div>

      {copilotState.visible && (
        <div className={`neural-copilot neural-copilot--${copilotState.type}`}>
          <div>
            <p className="neural-copilot-title">AI Copilot</p>
            <p className="neural-copilot-message">
              {copilotState.type === 'alert' ? '[!]' : '[OK]'}{' '}
              {copilotState.message}
            </p>
            {copilotState.detail && (
              <p className="neural-copilot-detail">{copilotState.detail}</p>
            )}
          </div>
          {copilotState.type === 'alert' && (
            <button type="button" className="neural-copilot-action" onClick={handleAutoFix}>
              Auto-Fix
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {hoveredNeuron && (
          <MathInspectorTooltip
            neuron={hoveredNeuron}
            trainingStep={trainingStep}
            position={tooltipPos}
            mode={mode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNeuron && (
          <NeuronDeepDiveModal
            neuron={selectedNeuron}
            architecture={architecture}
            grid={grid}
            points={points}
            mode={mode}
            network={networkRef.current}
            trainingStep={trainingStep}
            activeTab={deepDiveTab}
            onTabChange={setDeepDiveTab}
            onClose={() => setSelectedNeuron(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PresetButton = ({ preset, isActive, onClick }) => {
  return (
    <motion.button
      whileHover={{
        scale: 1.02,
        boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`neural-preset ${isActive ? 'active' : ''}`}
      type="button"
    >
      <div className="neural-preset-icon">{preset.icon}</div>
      <div className="neural-preset-body">
        <h4>{preset.name}</h4>
        <p>{preset.description}</p>
        <div className="neural-preset-arch">
          {preset.architecture.map((n, i) => (
            <React.Fragment key={`${preset.id}-${n}-${i}`}>
              <span>{n}</span>
              {i < preset.architecture.length - 1 && (
                <ArrowRight className="h-3 w-3" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </motion.button>
  );
};

const NetworkGraph = ({
  architecture,
  isTraining,
  trainingStep,
  speed,
  mode,
  onNeuronHover,
  onNeuronLeave,
  onPointerMove,
  onNeuronClick,
  highlightedEdge,
  size,
  simplified,
  visibleRows
}) => {
  const width = size?.width ?? 760;
  const height = size?.height ?? 440;
  const paddingX = 60;
  const paddingY = 50;
  const isSymbolic = mode === 'symbolic';
  const gateLabels = LOGIC_GATES;

  const nodes = useMemo(() => {
    const layers = architecture.length;
    const xGap = layers > 1 ? (width - paddingX * 2) / (layers - 1) : 0;

    return architecture.flatMap((layerSize, layerIndex) => {
      const yGap = layerSize > 1 ? (height - paddingY * 2) / (layerSize - 1) : 0;
      const yStart = layerSize > 1 ? paddingY : height / 2;
      return Array.from({ length: layerSize }).map((_, neuronIndex) => ({
        id: `L${layerIndex}N${neuronIndex}`,
        layerIndex,
        neuronIndex,
        x: paddingX + layerIndex * xGap,
        y: yStart + neuronIndex * yGap,
        label: isSymbolic
          ? layerIndex === 0
            ? `x${neuronIndex + 1}`
            : layerIndex === layers - 1
              ? `y${neuronIndex + 1}`
              : gateLabels[(layerIndex + neuronIndex) % gateLabels.length]
          : null
      }));
    });
  }, [architecture, gateLabels, isSymbolic]);

  const connections = useMemo(() => {
    const edges = [];
    let idx = 0;
    for (let layer = 0; layer < architecture.length - 1; layer += 1) {
      const current = nodes.filter((n) => n.layerIndex === layer);
      const next = nodes.filter((n) => n.layerIndex === layer + 1);
      current.forEach((from) => {
        next.forEach((to) => {
          const baseWeight = Math.sin((layer + 1) * 12.989 + from.neuronIndex * 78.233 + to.neuronIndex * 37.719);
          const dynamic = isTraining ? 0.35 * Math.sin(trainingStep * 0.08 + idx) : 0;
          const weight = baseWeight * (isSymbolic ? 0.65 : 1) + dynamic;
          edges.push({
            id: `${from.id}-${to.id}`,
            from,
            to,
            weight,
            opacity: 0.25 + Math.min(0.5, Math.abs(weight))
          });
          idx += 1;
        });
      });
    }
    return edges;
  }, [architecture, nodes, isTraining, trainingStep, isSymbolic]);

  const getNodeColor = (layerIndex) => {
    if (layerIndex === 0) return '#22d3ee';
    if (layerIndex === architecture.length - 1) return '#34d399';
    return '#a855f7';
  };

  return (
    <div className="neural-network">
      <motion.svg
        key={`${mode}-${architecture.join('-')}`}
        viewBox={`0 0 ${width} ${height}`}
        className="neural-network-svg"
        onMouseMove={onPointerMove}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="signalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="neural-edges">
          {connections.map((edge) => {
            const isVisibleRow =
              !simplified ||
              !Array.isArray(visibleRows) ||
              visibleRows.length === 0 ||
              edge.to.layerIndex !== 1 ||
              visibleRows.includes(edge.to.neuronIndex);
            const isHighlighted =
              highlightedEdge &&
              edge.from.layerIndex === highlightedEdge.fromLayer &&
              edge.from.neuronIndex === highlightedEdge.fromIndex &&
              edge.to.layerIndex === highlightedEdge.toLayer &&
              edge.to.neuronIndex === highlightedEdge.toIndex;
            const color = isHighlighted
              ? 'rgba(34, 211, 238, 0.95)'
              : edge.weight >= 0
                ? 'rgba(59, 130, 246, 0.75)'
                : 'rgba(245, 158, 11, 0.75)';
            const thickness = isHighlighted ? 3.2 : simplified ? 0.9 : 1.2 + Math.abs(edge.weight) * 2.4;
            const opacity = isHighlighted ? 0.95 : simplified ? (isVisibleRow ? 0.2 : 0.05) : edge.opacity;
            return (
              <React.Fragment key={edge.id}>
                <motion.line
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  strokeOpacity={opacity}
                  filter={isHighlighted ? 'url(#signalGlow)' : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1, stroke: color, strokeWidth: thickness }}
                  transition={{ duration: 0.5 }}
                />
                {isTraining && (
                  <motion.circle
                    cx={edge.from.x}
                    cy={edge.from.y}
                    r={isSymbolic ? 2.5 : 3}
                    fill="#4ade80"
                    filter="url(#signalGlow)"
                    animate={{
                      cx: [edge.from.x, edge.to.x],
                      cy: [edge.from.y, edge.to.y]
                    }}
                    transition={{
                      duration: Math.max(0.8, 1.4 - speed * 0.15),
                      repeat: Infinity,
                      delay: (edge.from.neuronIndex + edge.to.neuronIndex) * 0.15,
                      ease: 'linear'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </g>

        <g className="neural-nodes">
          {nodes.map((node) => {
            if (isSymbolic) {
              const width = 72;
              const height = 44;
              return (
                <g key={node.id}>
                  <motion.rect
                    x={node.x - width / 2}
                    y={node.y - height / 2}
                    width={width}
                    height={height}
                    rx="10"
                    className="neural-node"
                    fill={getNodeColor(node.layerIndex)}
                    fillOpacity="0.78"
                    stroke="rgba(255, 255, 255, 0.8)"
                    strokeWidth="1.2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    onMouseEnter={(event) => onNeuronHover?.(node, event)}
                    onMouseLeave={onNeuronLeave}
                    onClick={() => onNeuronClick?.(node)}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className="neural-node-label"
                  >
                    {node.label}
                  </text>
                </g>
              );
            }
            return (
              <motion.circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r="22"
                className="neural-node"
                fill={getNodeColor(node.layerIndex)}
                fillOpacity="0.85"
                stroke="rgba(255, 255, 255, 0.8)"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                onMouseEnter={(event) => onNeuronHover?.(node, event)}
                onMouseLeave={onNeuronLeave}
                onClick={() => onNeuronClick?.(node)}
              />
            );
          })}
        </g>
      </motion.svg>
    </div>
  );
};

const DecisionBoundaryPlot = ({ grid, z, points, onClick }) => {
  const classA = points.filter((p) => p.label === 0);
  const classB = points.filter((p) => p.label === 1);

  return (
    <div className="neural-plot neural-plot--boundary">
      <div className="neural-plot-frame">
        <Plot
          data={[
            {
              type: 'contour',
              x: grid.x,
              y: grid.y,
              z,
              colorscale: [
                [0, '#ef4444'],
                [0.5, '#1f2937'],
                [1, '#3b82f6']
              ],
              contours: { coloring: 'heatmap', showlines: false },
              showscale: false,
              opacity: 0.9,
              showlegend: false
            },
            {
              type: 'scatter',
              mode: 'markers',
              x: classA.map((p) => p.x),
              y: classA.map((p) => p.y),
              marker: {
                color: '#ef4444',
                size: 9,
                line: { color: '#ffffff', width: 1 }
              },
              showlegend: false
            },
            {
              type: 'scatter',
              mode: 'markers',
              x: classB.map((p) => p.x),
              y: classB.map((p) => p.y),
              marker: {
                color: '#3b82f6',
                size: 9,
                line: { color: '#ffffff', width: 1 }
              },
              showlegend: false
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            xaxis: {
              range: [-1.2, 1.2],
              showgrid: false,
              zeroline: false,
              visible: false
            },
            yaxis: {
              range: [-1.2, 1.2],
              showgrid: false,
              zeroline: false,
              visible: false
            }
          }}
          config={{ displayModeBar: false, responsive: true }}
          onClick={onClick}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

const LossChart = ({ lossHistory }) => {
  const xVals = lossHistory.map((_, idx) => idx);
  return (
    <div className="neural-plot neural-plot--loss">
      <div className="neural-plot-frame">
        <Plot
          data={[
            {
              type: 'scatter',
              mode: 'lines',
              x: xVals,
              y: lossHistory,
              line: { color: '#3b82f6', width: 3 },
              fill: 'tozeroy',
              fillcolor: 'rgba(59, 130, 246, 0.15)'
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            xaxis: { showgrid: false, zeroline: false, visible: false },
            yaxis: { showgrid: true, gridcolor: 'rgba(148,163,184,0.1)', visible: false }
          }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

const LossLandscape3D = ({ loss, trainingStep }) => {
  const { xVals, yVals, zVals } = useMemo(() => {
    const gridSize = 22;
    const range = 2.2;
    const xs = Array.from({ length: gridSize }, (_, i) => -range + (2 * range * i) / (gridSize - 1));
    const ys = Array.from({ length: gridSize }, (_, i) => -range + (2 * range * i) / (gridSize - 1));
    const zs = ys.map((y) =>
      xs.map((x) => x * x + y * y + 0.3 * Math.sin(x * 1.4) * Math.cos(y * 1.2))
    );
    return { xVals: xs, yVals: ys, zVals: zs };
  }, []);
  const radius = clamp(loss, 0.2, 2.4);
  const angle = trainingStep * 0.06;
  const px = radius * Math.cos(angle);
  const py = radius * Math.sin(angle);
  const pz = px * px + py * py;

  return (
    <div className="neural-plot neural-plot--losslandscape">
      <div className="neural-plot-frame">
        <Plot
          data={[
            {
              type: 'surface',
              x: xVals,
              y: yVals,
              z: zVals,
              colorscale: 'Viridis',
              opacity: 0.9,
              showscale: false
            },
            {
              type: 'scatter3d',
              mode: 'markers',
              x: [px],
              y: [py],
              z: [pz],
              marker: { color: '#ef4444', size: 6 },
              showlegend: false
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            scene: {
              xaxis: { visible: false },
              yaxis: { visible: false },
              zaxis: { visible: false },
              camera: { eye: { x: 1.3, y: 1.2, z: 0.9 } }
            }
          }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

const TruthTable = ({ gate = 'XOR', compact = false }) => {
  const rows = [
    { a: 0, b: 0, out: evaluateGate(gate, 0, 0) },
    { a: 0, b: 1, out: evaluateGate(gate, 0, 1) },
    { a: 1, b: 0, out: evaluateGate(gate, 1, 0) },
    { a: 1, b: 1, out: evaluateGate(gate, 1, 1) }
  ];
  return (
    <div className={`neural-truth-table ${compact ? 'compact' : ''}`}>
      <div className="neural-truth-title">Truth Table - {gate}</div>
      <table>
        <thead>
          <tr>
            <th>A</th>
            <th>B</th>
            <th>Out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${gate}-${idx}`}>
              <td>{row.a}</td>
              <td>{row.b}</td>
              <td>{row.out}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
const MathDerivationView = ({
  network,
  architecture,
  trainingStep,
  learningRate,
  mode,
  highlightedEdge,
  onWeightHover,
  onWeightLeave
}) => {
  const viewRef = useRef(null);
  const matrixRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const isSymbolic = mode === 'symbolic';
  const hasNetwork = Boolean(network);

  const weights = hasNetwork ? network.weights?.[0] || [] : [];
  const biases = hasNetwork ? network.biases?.[0] || [] : [];
  const gradientsW = hasNetwork ? network.gradientsW?.[0] || [] : [];
  const gradientsB = hasNetwork ? network.gradientsB?.[0] || [] : [];
  const inputVector = hasNetwork ? network.cache?.activations?.[0] || [] : [];
  const zVector = hasNetwork ? network.cache?.zs?.[0] || [] : [];
  const rows = weights.length;
  const cols = weights[0]?.length || 0;

  const weightRows = truncateRows(weights);
  const biasRows = truncateRows(biases);
  const inputRows = truncateRows(inputVector);
  const zRows = truncateRows(zVector);
  const gradRows = truncateRows(gradientsW);
  const gradBiasRows = truncateRows(gradientsB);

  const wLatex = matrixToLatex(weightRows.rows, true);
  const bLatex = vectorToLatex(biasRows.rows);
  const dWLatex = matrixToLatex(gradRows.rows);
  const dBLatex = vectorToLatex(gradBiasRows.rows);
  const xLatex = vectorToLatex(inputRows.rows);
  const zLatex = vectorToLatex(zRows.rows);

  const gradientSummary = useMemo(() => {
    if (!hasNetwork) return '';
    if (isSymbolic) {
      return 'Symbolic logic uses rule-based updates, not gradients.';
    }
    const flat = gradientsW.flat().concat(gradientsB);
    const avg = flat.length
      ? flat.reduce((sum, val) => sum + Math.abs(val), 0) / flat.length
      : 0;
    if (avg > 0.08) {
      return 'High gradients detected. Weights are updating fast.';
    }
    if (avg < 0.01) {
      return 'Gradients vanishing. We are near a minimum.';
    }
    return 'Gradients are stable. Learning is progressing.';
  }, [gradientsW, gradientsB, hasNetwork, isSymbolic]);

  const setMatrixHover = (event, row, col) => {
    if (!Number.isInteger(row) || !Number.isInteger(col)) return;
    const viewRect = viewRef.current?.getBoundingClientRect();
    const value = weights[row]?.[col] ?? 0;
    const tooltipWidth = 220;
    const tooltipHeight = 44;
    let left = event.clientX + 12;
    let top = event.clientY + 12;
    if (viewRect) {
      left = event.clientX - viewRect.left + 12;
      top = event.clientY - viewRect.top + 12;
      if (left + tooltipWidth > viewRect.width) {
        left = event.clientX - viewRect.left - tooltipWidth - 12;
      }
      if (top + tooltipHeight > viewRect.height) {
        top = event.clientY - viewRect.top - tooltipHeight - 12;
      }
    } else {
      if (left + tooltipWidth > window.innerWidth) {
        left = event.clientX - tooltipWidth - 12;
      }
      if (top + tooltipHeight > window.innerHeight) {
        top = event.clientY - tooltipHeight - 12;
      }
    }
    setHoverInfo({
      row,
      col,
      value,
      x: viewRect
        ? clamp(left, 12, viewRect.width - tooltipWidth - 12)
        : clamp(left, 12, window.innerWidth - tooltipWidth - 12),
      y: viewRect
        ? clamp(top, 12, viewRect.height - tooltipHeight - 12)
        : clamp(top, 12, window.innerHeight - tooltipHeight - 12)
    });
    onWeightHover?.({
      fromLayer: 0,
      fromIndex: col,
      toLayer: 1,
      toIndex: row,
      value
    });
  };

  const handleMatrixMove = (event) => {
    if (!matrixRef.current || rows === 0 || cols === 0) return;
    const rect = matrixRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setHoverInfo(null);
      onWeightLeave?.();
      return;
    }
    const row = Math.min(rows - 1, Math.max(0, Math.floor((y / rect.height) * rows)));
    const col = Math.min(cols - 1, Math.max(0, Math.floor((x / rect.width) * cols)));
    setMatrixHover(event, row, col);
  };

  const handleMatrixLeave = () => {
    setHoverInfo(null);
    onWeightLeave?.();
  };

  const body = !hasNetwork ? (
    <div className="neural-math-card">Waiting for the network to initialize...</div>
  ) : isSymbolic ? (
    <div className="neural-math-grid">
      <div className="neural-math-card">
        <h4>Symbolic Rules</h4>
        <BlockMath math={String.raw`y = A \oplus B`} throwOnError={false} />
        <p className="neural-math-caption">Truth table is shown on the left panel.</p>
      </div>
      <div className="neural-math-card neural-math-mini">
        <TruthTable gate="XOR" compact />
      </div>
    </div>
  ) : (
    <>
      <div className="neural-math-row">
        <div className="neural-math-block">
          <p>Input</p>
          <BlockMath math={`X = ${xLatex}`} throwOnError={false} />
        </div>
        <InlineMath math={String.raw`\times`} throwOnError={false} />
        <div className="neural-math-block neural-math-block--weights" ref={matrixRef} onMouseMove={handleMatrixMove} onMouseLeave={handleMatrixLeave}>
          <p>Weights</p>
          <BlockMath math={`W^{[1]} = ${wLatex}`} throwOnError={false} />
          {cols > 0 && (
            <div
              className="neural-matrix-hover-grid"
              style={{ '--matrix-cols': String(Math.max(cols, 1)) }}
              onMouseLeave={handleMatrixLeave}
            >
              {weightRows.rows.map((rowValues, displayRow) => {
                const actualRow = weightRows.rowMap?.[displayRow];
                if (!Array.isArray(rowValues) || !Number.isInteger(actualRow)) {
                  return (
                    <div
                      key={`ellipsis-${displayRow}`}
                      className="neural-matrix-cell neural-matrix-cell--ellipsis"
                      style={{ gridColumn: `1 / span ${Math.max(cols, 1)}` }}
                    >
                      ...
                    </div>
                  );
                }
                return rowValues.map((value, colIndex) => {
                  const isActive = hoverInfo?.row === actualRow && hoverInfo?.col === colIndex;
                  const safeValue = Number.isFinite(value) ? value : 0;
                  return (
                    <button
                      key={`w-${actualRow}-${colIndex}`}
                      type="button"
                      className={`neural-matrix-cell ${isActive ? 'active' : ''}`}
                      onMouseEnter={(event) => setMatrixHover(event, actualRow, colIndex)}
                    >
                      <span className="neural-mono">{roundTo(safeValue)}</span>
                    </button>
                  );
                });
              })}
            </div>
          )}
        </div>
        <InlineMath math="+" throwOnError={false} />
        <div className="neural-math-block">
          <p>Bias</p>
          <BlockMath math={`b^{[1]} = ${bLatex}`} throwOnError={false} />
        </div>
        <InlineMath math="=" throwOnError={false} />
        <div className="neural-math-block">
          <p>Z</p>
          <BlockMath math={`Z^{[1]} = ${zLatex}`} throwOnError={false} />
        </div>
      </div>

      <div className="neural-math-grid">
        <div className="neural-math-card">
          <h4>Gradients</h4>
          <BlockMath math={String.raw`\frac{\partial L}{\partial W^{[1]}} = ${dWLatex}`} throwOnError={false} />
          <BlockMath math={String.raw`\frac{\partial L}{\partial b^{[1]}} = ${dBLatex}`} throwOnError={false} />
          <p className="neural-math-caption">
            Step {trainingStep} - LR {learningRate.toFixed(3)}
          </p>
          <p className="neural-math-insight">{gradientSummary}</p>
        </div>
        <div className="neural-math-card neural-math-mini">
          <h4>Connections</h4>
          <NetworkGraph
            architecture={architecture || network.architecture}
            isTraining={false}
            trainingStep={trainingStep}
            speed={1}
            mode="neural"
            highlightedEdge={highlightedEdge}
            simplified
            visibleRows={weightRows.indices}
            size={{ width: 520, height: 300 }}
          />
          <p className="neural-math-caption">Hover a weight cell to highlight its link.</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="neural-math-view" ref={viewRef}>
      {body}
      {hoverInfo && !isSymbolic && (
        <div className="neural-math-tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
          W[1]({hoverInfo.row + 1}, {hoverInfo.col + 1})
          <span className="neural-mono"> ({hoverInfo.value.toFixed(3)})</span>
        </div>
      )}
    </div>
  );
};

const NeuronDeepDiveModal = ({
  neuron,
  architecture,
  grid,
  points,
  mode,
  network,
  trainingStep,
  activeTab,
  onTabChange,
  onClose
}) => {
  const isSymbolic = mode === 'symbolic';
  const layerIndex = neuron.layerIndex;
  const isOutputLayer = layerIndex >= architecture.length - 1;

  const outgoingWeights = useMemo(() => {
    if (!network || isSymbolic || isOutputLayer) return [];
    const layerWeights = network.weights?.[layerIndex];
    if (!layerWeights) return [];
    return layerWeights.map((row) => row[neuron.neuronIndex] ?? 0);
  }, [network, isSymbolic, isOutputLayer, layerIndex, neuron.neuronIndex, trainingStep]);

  const activationMap = useMemo(() => {
    if (!network || isSymbolic) return null;
    if (!grid?.x || !grid?.y) return null;
    return network.getNeuronActivationMap(grid.x, grid.y, layerIndex, neuron.neuronIndex);
  }, [network, isSymbolic, grid, layerIndex, neuron.neuronIndex, trainingStep]);

  const weightLabels = outgoingWeights.map((_, idx) => `L${layerIndex + 1}N${idx}`);
  const classA = (points || []).filter((p) => p.label === 0);
  const classB = (points || []).filter((p) => p.label === 1);

  return (
    <motion.div
      className="neural-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="neural-modal"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="neural-modal-header">
          <div>
            <p className="neural-modal-eyebrow">Neuron Deep Dive</p>
            <h3>
              Neuron L{layerIndex}_N{neuron.neuronIndex}
            </h3>
          </div>
          <button type="button" className="neural-modal-close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="neural-modal-tabs">
          <button
            type="button"
            className={`neural-modal-tab ${activeTab === 'impact' ? 'active' : ''}`}
            onClick={() => onTabChange('impact')}
          >
            Impact Analysis
          </button>
          <button
            type="button"
            className={`neural-modal-tab ${activeTab === 'receptive' ? 'active' : ''}`}
            onClick={() => onTabChange('receptive')}
          >
            Receptive Field
          </button>
        </div>

        <div className="neural-modal-body">
          {isSymbolic ? (
            <div className="neural-modal-empty">
              Symbolic mode does not support neuron activation maps yet.
            </div>
            ) : activeTab === 'impact' ? (
              outgoingWeights.length ? (
                <div className="neural-modal-plot">
                  <div className="neural-modal-subtitle">
                    Taller bars = stronger contribution to the network's decision.
                  </div>
                  <div className="neural-plot-frame">
                    <Plot
                      data={[
                        {
                          type: 'bar',
                          x: weightLabels,
                          y: outgoingWeights,
                          marker: {
                            color: outgoingWeights.map((w) => (w >= 0 ? '#22c55e' : '#ef4444'))
                          },
                          hovertemplate:
                            'Influence: %{y:.3f}<br>High Bar = Strong Influence<br>Red = Inhibitory<extra></extra>'
                        }
                      ]}
                      layout={{
                        autosize: true,
                        margin: { l: 20, r: 10, t: 20, b: 30 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        xaxis: {
                          title: { text: 'Target Neurons (Next Layer)', font: { color: '#cbd5f5', size: 11 } },
                          tickfont: { color: '#cbd5f5', size: 10 },
                          gridcolor: 'rgba(148,163,184,0.1)'
                        },
                        yaxis: {
                          title: { text: 'Influence Strength (Weight)', font: { color: '#cbd5f5', size: 11 } },
                          tickfont: { color: '#cbd5f5', size: 10 },
                          zerolinecolor: 'rgba(148,163,184,0.2)',
                          gridcolor: 'rgba(148,163,184,0.1)'
                        }
                    }}
                    config={{ displayModeBar: false, responsive: true }}
                    useResizeHandler
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <div className="neural-modal-empty">
                This output neuron has no outgoing weights to analyze.
              </div>
            )
            ) : activationMap ? (
              <div className="neural-modal-plot">
                <div className="neural-modal-subtitle">
                  What this neuron sees vs. the full data.
                </div>
                <div className="neural-plot-frame">
                  <Plot
                    data={[
                      {
                        type: 'heatmap',
                        x: grid.x,
                        y: grid.y,
                        z: activationMap,
                        colorscale: [
                          [0, '#020617'],
                          [0.4, '#064e3b'],
                          [0.7, '#10b981'],
                          [1, '#a7f3d0']
                        ],
                        showscale: false
                      },
                      {
                        type: 'scatter',
                        mode: 'markers',
                        x: classA.map((p) => p.x),
                        y: classA.map((p) => p.y),
                        marker: {
                          color: 'rgba(248, 113, 113, 0.45)',
                          size: 6,
                          line: { color: 'rgba(255, 255, 255, 0.4)', width: 1 }
                        },
                        showlegend: false,
                        hoverinfo: 'skip'
                      },
                      {
                        type: 'scatter',
                        mode: 'markers',
                        x: classB.map((p) => p.x),
                        y: classB.map((p) => p.y),
                        marker: {
                          color: 'rgba(96, 165, 250, 0.45)',
                          size: 6,
                          line: { color: 'rgba(255, 255, 255, 0.4)', width: 1 }
                        },
                        showlegend: false,
                        hoverinfo: 'skip'
                      }
                    ]}
                  layout={{
                    autosize: true,
                    margin: { l: 0, r: 0, t: 0, b: 0 },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    xaxis: { visible: false },
                    yaxis: { visible: false }
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div className="neural-modal-empty">Activation map not available yet.</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const MathInspectorTooltip = ({ neuron, trainingStep, position, mode }) => {
  const isSymbolic = mode === 'symbolic';
  if (isSymbolic) {
    const inputA = Math.sin(trainingStep * 0.08 + neuron.layerIndex) > 0 ? 1 : 0;
    const inputB = Math.cos(trainingStep * 0.09 + neuron.neuronIndex) > 0 ? 1 : 0;
    const gate = neuron.label || 'AND';
    const isIO = gate.startsWith('x') || gate.startsWith('y');
    const output = isIO ? inputA : evaluateGate(gate, inputA, inputB);
    const confidence = roundTo(0.45 + 0.5 * (1 - Math.exp(-trainingStep * 0.04)));

    return (
      <motion.div
        className="neural-tooltip"
        style={{ left: position.x + 20, top: position.y - 20 }}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 12 }}
      >
        <h4 className="neural-tooltip-title">
          LOGIC NODE L{neuron.layerIndex}_N{neuron.neuronIndex}
        </h4>
        <div className="neural-tooltip-equation">
          <span>{isIO ? 'Value: ' : 'Rule: '}</span>
          <span className="neural-tooltip-sum">{gate}</span>
          {!isIO && <span> (A, B)</span>}
        </div>
        <div className="neural-tooltip-values">
          <div>
            Input A: <span className="neural-mono">{inputA}</span>
          </div>
          <div>
            Input B: <span className="neural-mono">{inputB}</span>
          </div>
          <div>
            Output: <span className="neural-tooltip-output">{output}</span>
          </div>
          <div>
            Rule Strength: <span className="neural-mono">{confidence}</span>
          </div>
        </div>
        <div className="neural-tooltip-activation">
          <Activity className="h-3 w-3" />
          <span>Learning</span>
          <span className="neural-tooltip-pill">Hebbian</span>
        </div>
      </motion.div>
    );
  }
  const inputs = Array.from({ length: 3 }).map((_, idx) => {
    return roundTo(Math.sin(neuron.layerIndex * 1.7 + idx * 2.1 + trainingStep * 0.08) * 0.6 + 0.6);
  });
  const weights = inputs.map((_, idx) =>
    roundTo(Math.cos(neuron.neuronIndex * 1.4 + idx * 1.9 - trainingStep * 0.05) * 0.9)
  );
  const bias = roundTo(Math.sin(trainingStep * 0.04 + neuron.layerIndex) * 0.3);
  const z = roundTo(weights.reduce((sum, w, i) => sum + w * inputs[i], bias));
  const activation = roundTo(1 / (1 + Math.exp(-z)));

  return (
    <motion.div
      className="neural-tooltip"
      style={{ left: position.x + 20, top: position.y - 20 }}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 12 }}
    >
      <h4 className="neural-tooltip-title">
        NEURON L{neuron.layerIndex}_N{neuron.neuronIndex}
      </h4>
      <div className="neural-tooltip-equation">
        <span>z = </span>
        <span className="neural-tooltip-sum">∑(w•x)</span>
        <span> + </span>
        <span className="neural-tooltip-bias">b</span>
      </div>
      <div className="neural-tooltip-values">
        <div>
          Weight: <span className="neural-mono">{weights[0]}</span>
        </div>
        <div>
          Input: <span className="neural-mono">{inputs[0]}</span>
        </div>
        <div>
          Output: <span className="neural-tooltip-output">{activation}</span> (Sigmoid)
        </div>
      </div>
      <div className="neural-tooltip-activation">
        <Activity className="h-3 w-3" />
        <span>Activation</span>
        <span className="neural-tooltip-pill">Sigmoid</span>
      </div>
    </motion.div>
  );
};

const seedLossHistory = () => {
  return Array.from({ length: 20 }, (_, i) => roundTo(0.9 - i * 0.02 + Math.random() * 0.01));
};

const generateDataset = (type) => {
  const count = 220;
  switch (type) {
    case 'circle':
      return generateCircle(count);
    case 'spiral':
      return generateSpiral(count);
    case 'linear':
      return generateLinear(count);
    case 'xor':
    default:
      return generateXor(count);
  }
};

const generateXor = (count) => {
  return Array.from({ length: count }).map(() => {
    const x = randRange(-1.08, 1.08) + randRange(-0.12, 0.12);
    const y = randRange(-1.08, 1.08) + randRange(-0.12, 0.12);
    const decision = x * y + 0.14 * Math.sin(2.4 * x) - 0.1 * Math.cos(2.2 * y) + randRange(-0.18, 0.18);
    const label = maybeFlipLabel(decision > 0 ? 1 : 0, 0.12);
    return { x, y, label };
  });
};

const generateCircle = (count) => {
  return Array.from({ length: count }).map(() => {
    const r = Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;
    const x = r * Math.cos(angle) + randRange(-0.06, 0.06);
    const y = r * Math.sin(angle) + randRange(-0.06, 0.06);
    const radius = Math.sqrt(x * x + y * y);
    const warpedBoundary = 0.56 + 0.09 * Math.sin(4 * angle) + randRange(-0.07, 0.07);
    const label = maybeFlipLabel(radius < warpedBoundary ? 1 : 0, 0.1);
    return { x, y, label };
  });
};

const generateSpiral = (count) => {
  const points = [];
  const half = Math.floor(count / 2);
  for (let i = 0; i < half; i += 1) {
    const t = (i / half) * Math.PI * 4;
    const r = i / half;
    const spiralNoise = randRange(-0.11, 0.11);
    points.push({
      x: r * Math.cos(t) + spiralNoise,
      y: r * Math.sin(t) + randRange(-0.11, 0.11),
      label: maybeFlipLabel(0, 0.08)
    });
    points.push({
      x: r * Math.cos(t + Math.PI) + randRange(-0.11, 0.11),
      y: r * Math.sin(t + Math.PI) + spiralNoise,
      label: maybeFlipLabel(1, 0.08)
    });
  }
  return points;
};

const generateLinear = (count) => {
  return Array.from({ length: count }).map(() => {
    const x = randRange(-1.1, 1.1) + randRange(-0.08, 0.08);
    const y = randRange(-1.1, 1.1) + randRange(-0.08, 0.08);
    const decision = x + y + 0.28 * Math.sin(3 * x) - 0.2 * Math.cos(2 * y) + randRange(-0.24, 0.24);
    const label = maybeFlipLabel(decision > 0 ? 1 : 0, 0.1);
    return { x, y, label };
  });
};

const predictBoundary = (x, y, type, step) => {
  const t = step * 0.04;
  switch (type) {
    case 'circle': {
      const r = Math.sqrt(x * x + y * y);
      const boundary = 0.6 - Math.min(step / 200, 0.18);
      const noise = 0.15 * Math.sin(t + x * 3 - y * 2);
      return sigmoid((boundary - r + noise) * 6);
    }
    case 'spiral': {
      const r = Math.sqrt(x * x + y * y);
      const angle = Math.atan2(y, x);
      const swirl = Math.sin(3 * angle + r * 4 - t);
      return sigmoid(swirl * 3 - r * 1.3);
    }
    case 'linear': {
      const line = x + y + 0.4 * Math.sin(t * 0.6);
      return sigmoid(line * 3);
    }
    case 'xor':
    default: {
      const raw = x * y + 0.4 * Math.sin(t + x * 2) - 0.2 * Math.cos(t + y * 2);
      return sigmoid(raw * 4);
    }
  }
};

const sigmoid = (value) => 1 / (1 + Math.exp(-value));
const evaluateGate = (gate, a, b) => {
  switch (gate) {
    case 'AND':
      return a && b ? 1 : 0;
    case 'OR':
      return a || b ? 1 : 0;
    case 'XOR':
      return a ^ b ? 1 : 0;
    case 'NAND':
      return !(a && b) ? 1 : 0;
    case 'NOR':
      return !(a || b) ? 1 : 0;
    case 'XNOR':
      return a === b ? 1 : 0;
    case 'IMPLIES':
      return !a || b ? 1 : 0;
    default:
      return a;
  }
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randRange = (min, max) => Math.random() * (max - min) + min;
const maybeFlipLabel = (label, probability = 0.08) => (Math.random() < probability ? 1 - label : label);
const roundTo = (value) => Number(value.toFixed(3));
const mapSpeedToDelay = (value) => {
  const clamped = clamp(value, 0.5, 5);
  const ratio = (clamped - 0.5) / 4.5;
  return Math.round(460 - ratio * 430);
};

const matrixToLatex = (matrix, colorize = false) => {
  if (!matrix || matrix.length === 0) return '\\begin{bmatrix}\\end{bmatrix}';
  const columns = matrix.find((row) => Array.isArray(row))?.length || 1;
  return `\\begin{bmatrix}${matrix
    .map((row) => {
      if (!row) {
        return Array.from({ length: columns }).map(() => '\\vdots').join(' & ');
      }
      return row
        .map((val) => {
          const safe = Number.isFinite(val) ? val : 0;
          if (!colorize) return roundTo(safe);
          return colorizeLatexValue(safe);
        })
        .join(' & ');
    })
    .join(' \\\\ ')}\\end{bmatrix}`;
};

const vectorToLatex = (vector) => {
  if (!vector || vector.length === 0) return '\\begin{bmatrix}\\end{bmatrix}';
  return `\\begin{bmatrix}${vector
    .map((val) => {
      if (val === null) return '\\vdots';
      return roundTo(Number.isFinite(val) ? val : 0);
    })
    .join(' \\\\ ')}\\end{bmatrix}`;
};

const truncateRows = (rows, maxRows = 6) => {
  if (!rows || rows.length === 0) {
    return { rows: [], indices: [], rowMap: [] };
  }
  if (rows.length <= maxRows) {
    return {
      rows,
      indices: rows.map((_, idx) => idx),
      rowMap: rows.map((_, idx) => idx)
    };
  }
  return {
    rows: [rows[0], rows[1], rows[2], null, rows[rows.length - 1]],
    indices: [0, 1, 2, rows.length - 1],
    rowMap: [0, 1, 2, null, rows.length - 1]
  };
};

const colorizeLatexValue = (value) => {
  if (Math.abs(value) < 0.05) {
    return `\\color{gray}{${roundTo(value)}}`;
  }
  if (value > 0) {
    return `\\color{green}{${roundTo(value)}}`;
  }
  return `\\color{red}{${roundTo(value)}}`;
};

export default NeuralPlayground;


