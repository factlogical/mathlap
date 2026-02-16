import {
  Cpu,
  Gauge,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sigma,
  Sparkles,
  Trash2
} from "lucide-react";

const LINEAR_PRESETS = [
  { id: "linear_clear", label: "Linear Clear" },
  { id: "linear_noisy", label: "Linear Noisy" },
  { id: "linear_outliers", label: "With Outliers" }
];

const LOGISTIC_PRESETS = [
  { id: "logistic_circle", label: "Circle Split" },
  { id: "logistic_xor", label: "XOR Cloud" },
  { id: "logistic_linear", label: "Linear Split" },
  { id: "logistic_exponential", label: "Exponential Split" }
];

const ALGORITHM_OPTIONS = [
  { id: "batch", label: "Batch GD" },
  { id: "mini_batch", label: "Mini-batch GD" },
  { id: "momentum", label: "Momentum" }
];

const LOSS_OPTIONS = {
  linear: [
    { id: "mse", label: "MSE" },
    { id: "mae", label: "MAE" },
    { id: "huber", label: "Huber" }
  ],
  logistic: [
    { id: "bce", label: "Binary CE" },
    { id: "focal", label: "Focal" },
    { id: "mae", label: "MAE" },
    { id: "mse", label: "MSE" },
    { id: "hinge", label: "Hinge" },
    { id: "log_cosh", label: "Log-Cosh" }
  ]
};

export default function ModelControls({
  mode,
  linearVariant,
  polynomialDegree,
  logisticVariant,
  logisticDegree,
  logisticFeatureDims,
  algorithm,
  lossFunction,
  learningRate,
  stepsPerFrame,
  isTraining,
  canTrain,
  epoch,
  pointsCount,
  classCounts,
  selectedClass,
  onModeChange,
  onLinearVariantChange,
  onPolynomialDegreeChange,
  onLogisticVariantChange,
  onLogisticDegreeChange,
  onLogisticFeatureDimsChange,
  onAlgorithmChange,
  onLossChange,
  onLearningRateChange,
  onStepsChange,
  onToggleTraining,
  onResetModel,
  onClearPoints,
  onApplyPreset,
  onGenerateRandom,
  onSelectedClassChange,
  onToggleChat
}) {
  const presets = mode === "linear" ? LINEAR_PRESETS : LOGISTIC_PRESETS;
  const lossOptions = LOSS_OPTIONS[mode];
  const complexityLevel = polynomialDegree <= 3 ? "Good" : polynomialDegree <= 6 ? "Medium" : "High";
  const complexityWidth = Math.round((polynomialDegree / 10) * 100);
  const lrMax =
    mode === "linear" ? (linearVariant === "polynomial" ? 0.03 : 0.05) : logisticVariant === "linear" ? 0.2 : 0.12;

  return (
    <section className="reglab-panel reglab-controls">
      <div className="reglab-controls-title">
        <Cpu size={16} />
        <strong>Training Controls</strong>
      </div>

      <div className="reglab-controls-grid">
        <label className="reglab-field">
          <span>Model Type</span>
          <select value={mode} onChange={(event) => onModeChange(event.target.value)}>
            <option value="linear">Linear Regression</option>
            <option value="logistic">Logistic Regression</option>
          </select>
        </label>

        <label className="reglab-field">
          <span>
            <Gauge size={14} />
            Algorithm
          </span>
          <select value={algorithm} onChange={(event) => onAlgorithmChange(event.target.value)}>
            {ALGORITHM_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="reglab-field">
          <span>
            <Sigma size={14} />
            Loss Function
          </span>
          <select value={lossFunction} onChange={(event) => onLossChange(event.target.value)}>
            {lossOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === "linear" && (
        <div className="reglab-variant">
          <span>Regression Family</span>
          <div>
            <button
              type="button"
              className={linearVariant === "linear" ? "active" : ""}
              onClick={() => onLinearVariantChange("linear")}
            >
              Linear
            </button>
            <button
              type="button"
              className={linearVariant === "polynomial" ? "active" : ""}
              onClick={() => onLinearVariantChange("polynomial")}
            >
              Polynomial
            </button>
          </div>
        </div>
      )}

      {mode === "logistic" && (
        <div className="reglab-variant">
          <span>Logistic Feature Map</span>
          <div className="reglab-variant-3">
            <button
              type="button"
              className={logisticVariant === "linear" ? "active" : ""}
              onClick={() => onLogisticVariantChange("linear")}
            >
              Linear
            </button>
            <button
              type="button"
              className={logisticVariant === "polynomial" ? "active" : ""}
              onClick={() => onLogisticVariantChange("polynomial")}
            >
              Polynomial
            </button>
            <button
              type="button"
              className={logisticVariant === "exponential" ? "active" : ""}
              onClick={() => onLogisticVariantChange("exponential")}
            >
              Exponential
            </button>
          </div>
        </div>
      )}

      {mode === "linear" && linearVariant === "polynomial" && (
        <div className="reglab-controls-row">
          <label>
            Degree
            <span className="reglab-mono">{polynomialDegree}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={polynomialDegree}
            onChange={(event) => onPolynomialDegreeChange(parseInt(event.target.value, 10))}
          />
          <div className="reglab-complexity">
            <div
              className={`reglab-complexity-fill ${complexityLevel.toLowerCase()}`}
              style={{ width: `${complexityWidth}%` }}
            />
            <span>{complexityLevel}</span>
          </div>
        </div>
      )}

      {mode === "logistic" && logisticVariant === "polynomial" && (
        <div className="reglab-controls-row">
          <label>
            Logistic Degree
            <span className="reglab-mono">{logisticDegree}</span>
          </label>
          <input
            type="range"
            min="2"
            max="5"
            step="1"
            value={logisticDegree}
            onChange={(event) => onLogisticDegreeChange(parseInt(event.target.value, 10))}
          />
        </div>
      )}

      {mode === "logistic" && logisticVariant !== "linear" && (
        <div className="reglab-controls-row">
          <label>
            Feature Dimensions
            <span className="reglab-mono">{logisticFeatureDims}</span>
          </label>
          <input
            type="range"
            min="4"
            max="20"
            step="1"
            value={logisticFeatureDims}
            onChange={(event) => onLogisticFeatureDimsChange(parseInt(event.target.value, 10))}
          />
        </div>
      )}

      <div className="reglab-presets">
        {presets.map((preset) => (
          <button key={preset.id} type="button" onClick={() => onApplyPreset(preset.id)}>
            {preset.label}
          </button>
        ))}
      </div>

      <div className="reglab-controls-row">
        <label>
          Learning Rate
          <span className="reglab-mono">{learningRate.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min={mode === "linear" ? "0.001" : "0.005"}
          max={String(lrMax)}
          step="0.001"
          value={learningRate}
          onChange={(event) => onLearningRateChange(parseFloat(event.target.value))}
        />
      </div>

      <div className="reglab-controls-row">
        <label>
          Steps / Frame
          <span className="reglab-mono">{stepsPerFrame}</span>
        </label>
        <input
          type="range"
          min="1"
          max="90"
          step="1"
          value={stepsPerFrame}
          onChange={(event) => onStepsChange(parseInt(event.target.value, 10))}
        />
      </div>

      {mode === "logistic" && (
        <div className="reglab-class-picker">
          <span>Left Click Class</span>
          <div>
            <button
              type="button"
              className={selectedClass === 0 ? "active class0" : "class0"}
              onClick={() => onSelectedClassChange(0)}
            >
              Class 0
            </button>
            <button
              type="button"
              className={selectedClass === 1 ? "active class1" : "class1"}
              onClick={() => onSelectedClassChange(1)}
            >
              Class 1
            </button>
          </div>
          <small>Right click inserts opposite class.</small>
        </div>
      )}

      <div className="reglab-buttons">
        <button type="button" onClick={onToggleTraining} disabled={!canTrain} className="reglab-btn-primary">
          {isTraining ? <Pause size={15} /> : <Play size={15} />}
          {isTraining ? "Pause" : "Start"}
        </button>
        <button type="button" onClick={onResetModel}>
          <RotateCcw size={15} />
          Reset Model
        </button>
        <button type="button" onClick={onClearPoints}>
          <Trash2 size={15} />
          Clear Points
        </button>
        <button type="button" onClick={onGenerateRandom}>
          <Shuffle size={15} />
          Random Data
        </button>
      </div>

      <div className="reglab-stats">
        <p>
          Epoch <span className="reglab-mono">{epoch}</span>
        </p>
        <p>
          Points <span className="reglab-mono">{pointsCount}</span>
        </p>
        {mode === "logistic" && (
          <p>
            Class0 / Class1{" "}
            <span className="reglab-mono">
              {classCounts[0]} / {classCounts[1]}
            </span>
          </p>
        )}
      </div>

      <button type="button" className="reglab-chat-toggle" onClick={onToggleChat}>
        <MessageSquare size={15} />
        Toggle AI Chat
      </button>

      <div className="reglab-micro-tip">
        <Sparkles size={14} />
        <span>Training starts only when you press Start.</span>
      </div>
    </section>
  );
}
