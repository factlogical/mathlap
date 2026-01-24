import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Download,
  Pause,
  Play,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Target
} from 'lucide-react';

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
  const [hoveredNeuron, setHoveredNeuron] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isSymbolic = mode === 'symbolic';
  const coachMessage = useMemo(() => {
    const losses = lossHistory;
    const longEnough = losses.length >= 11;
    const recentDrop = longEnough ? losses[losses.length - 11] - losses[losses.length - 1] : 0.02;
    const stuck = isTraining && longEnough && recentDrop < 0.01;
    const success = metrics.accuracy > 0.95;
    const linearHint = dataset === 'linear' && architecture.length > 3;

    if (success) {
      return '🎉 Great fit! The model has mastered this pattern.';
    }
    if (stuck) {
      return '⚠️ Learning is stuck. Try changing the Learning Rate or Architecture.';
    }
    if (linearHint) {
      return '💡 Tip: A shallow network is enough for this simple data.';
    }
    return '';
  }, [lossHistory, metrics.accuracy, dataset, architecture.length, isTraining]);

  const customArchitecture = useMemo(() => {
    return [2, ...Array(layers).fill(neurons), 1];
  }, [layers, neurons]);

  const grid = useMemo(() => {
    const size = 45;
    const x = Array.from({ length: size }, (_, i) => -1.2 + (2.4 * i) / (size - 1));
    const y = Array.from({ length: size }, (_, i) => -1.2 + (2.4 * i) / (size - 1));
    return { x, y };
  }, []);

  const contourZ = useMemo(() => {
    return grid.y.map((y) =>
      grid.x.map((x) => predictBoundary(x, y, dataset, trainingStep))
    );
  }, [grid.x, grid.y, dataset, trainingStep]);

  useEffect(() => {
    setPoints(generateDataset(dataset));
    setIsTraining(false);
    setTrainingStep(0);
    setLossHistory(seedLossHistory());
    setMetrics({ loss: 0.82, accuracy: 0.52, epoch: 0 });
  }, [dataset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
    return () => clearTimeout(timer);
  }, [isTraining, coachMessage]);

  useEffect(() => {
    if (!isTraining) return;
    const interval = setInterval(() => {
      setTrainingStep((prev) => prev + 1);
    }, Math.max(120, 450 / speed));
    return () => clearInterval(interval);
  }, [isTraining, speed]);

  useEffect(() => {
    const loss = clamp(0.06, 0.9 * Math.exp(-trainingStep * 0.035) + 0.04 * Math.sin(trainingStep * 0.35), 1);
    const accuracy = clamp(0.5, 1 - loss + 0.06 * Math.sin(trainingStep * 0.2), 0.99);
    setMetrics({ loss, accuracy, epoch: trainingStep });
    setLossHistory((prev) => [...prev.slice(-60), loss]);
  }, [trainingStep]);

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
    setTrainingStep(0);
    setLossHistory(seedLossHistory());
    setMetrics({ loss: 0.82, accuracy: 0.52, epoch: 0 });
  };

  const handleBoundaryClick = (event) => {
    const point = event?.points?.[0];
    if (!point) return;
    const label = predictBoundary(point.x, point.y, dataset, trainingStep) > 0.5 ? 1 : 0;
    setPoints((prev) => [...prev, { x: point.x, y: point.y, label }]);
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
        <div>
          <h1 className="neural-title">🧠 Neural Network Playground</h1>
          <p className="neural-subtitle">Watch AI learn in real-time</p>
        </div>
        <div className="neural-header-actions">
          <button className="neural-icon-btn" type="button">
            <Download className="h-4 w-4" />
            Download
          </button>
          <button className="neural-icon-btn" type="button">
            <Share2 className="h-4 w-4" />
            Share
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
          </div>
          <div className="neural-visual-body">
            <NetworkGraph
              architecture={architecture}
              isTraining={isTraining}
              trainingStep={trainingStep}
              speed={speed}
              mode={mode}
              onNeuronHover={handleNeuronHover}
              onNeuronLeave={handleNeuronLeave}
              onPointerMove={handlePointerMove}
            />
            <div className="neural-math-hint">
              Math Inspector يظهر عند تمرير الماوس (Phase 3)
            </div>
          </div>
        </section>

        <aside className="neural-panel neural-problem">
          <div className="neural-card neural-card--boundary">
            <div className="neural-section-header neural-section-header--split">
              <div className="neural-section-title">
                <h3>Decision Boundary</h3>
                <Target className="h-4 w-4 text-indigo-300" />
              </div>
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
            </div>
            <DecisionBoundaryPlot
              grid={grid}
              z={contourZ}
              points={points}
              onClick={handleBoundaryClick}
            />
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
                  <span className="neural-mono">{speed}x</span>
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
              {coachMessage && (
                <div className="neural-coach">
                  {coachMessage}
                </div>
              )}
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
        Current architecture: <span className="neural-mono">{architecture.join(' → ')}</span>
        <span className="neural-mono"> | Mode: {isSymbolic ? 'Symbolic Logic' : 'Neural'}</span>
      </div>

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

const NetworkGraph = ({ architecture, isTraining, trainingStep, speed, mode, onNeuronHover, onNeuronLeave, onPointerMove }) => {
  const width = 760;
  const height = 440;
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
            const color = edge.weight >= 0 ? 'rgba(59, 130, 246, 0.75)' : 'rgba(245, 158, 11, 0.75)';
            const thickness = 1.2 + Math.abs(edge.weight) * 2.4;
            return (
              <React.Fragment key={edge.id}>
                <motion.line
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  strokeOpacity={edge.opacity}
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
                    fill={getNodeColor(node.layerIndex)}
                    fillOpacity="0.78"
                    stroke="rgba(255, 255, 255, 0.8)"
                    strokeWidth="1.2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    onMouseEnter={(event) => onNeuronHover?.(node, event)}
                    onMouseLeave={onNeuronLeave}
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
                fill={getNodeColor(node.layerIndex)}
                fillOpacity="0.85"
                stroke="rgba(255, 255, 255, 0.8)"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                onMouseEnter={(event) => onNeuronHover?.(node, event)}
                onMouseLeave={onNeuronLeave}
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
  const count = 120;
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
    const x = randRange(-1, 1);
    const y = randRange(-1, 1);
    const label = x * y > 0 ? 1 : 0;
    return { x, y, label };
  });
};

const generateCircle = (count) => {
  return Array.from({ length: count }).map(() => {
    const r = Math.sqrt(Math.random());
    const angle = Math.random() * Math.PI * 2;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const radius = Math.sqrt(x * x + y * y);
    const label = radius < 0.6 ? 1 : 0;
    return { x, y, label };
  });
};

const generateSpiral = (count) => {
  const points = [];
  const half = Math.floor(count / 2);
  for (let i = 0; i < half; i += 1) {
    const t = (i / half) * Math.PI * 4;
    const r = i / half;
    points.push({
      x: r * Math.cos(t) + randRange(-0.05, 0.05),
      y: r * Math.sin(t) + randRange(-0.05, 0.05),
      label: 0
    });
    points.push({
      x: r * Math.cos(t + Math.PI) + randRange(-0.05, 0.05),
      y: r * Math.sin(t + Math.PI) + randRange(-0.05, 0.05),
      label: 1
    });
  }
  return points;
};

const generateLinear = (count) => {
  return Array.from({ length: count }).map(() => {
    const x = randRange(-1, 1);
    const y = randRange(-1, 1);
    const label = x + y > 0 ? 1 : 0;
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
const roundTo = (value) => Number(value.toFixed(3));

export default NeuralPlayground;
