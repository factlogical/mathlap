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
  { id: "linear_clear", label: "خطي واضح" },
  { id: "linear_noisy", label: "خطي بضوضاء" },
  { id: "linear_outliers", label: "مع نقاط شاذة" }
];

const LOGISTIC_PRESETS = [
  { id: "logistic_circle", label: "فصل دائري" },
  { id: "logistic_xor", label: "سحابة XOR" },
  { id: "logistic_linear", label: "فصل خطي" },
  { id: "logistic_exponential", label: "فصل أسي" }
];

const ALGORITHM_OPTIONS = [
  { id: "batch", label: "دفعة كاملة" },
  { id: "mini_batch", label: "دفعة مصغرة" },
  { id: "momentum", label: "زخم" }
];

const LOSS_OPTIONS = {
  linear: [
    { id: "mse", label: "MSE" },
    { id: "mae", label: "MAE" },
    { id: "huber", label: "Huber" }
  ],
  logistic: [
    { id: "bce", label: "BCE ثنائي" },
    { id: "focal", label: "فوكال" },
    { id: "mae", label: "MAE" },
    { id: "mse", label: "MSE" },
    { id: "hinge", label: "هنج" },
    { id: "log_cosh", label: "لوغ-كوش" }
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
  const complexityKey = polynomialDegree <= 3 ? "good" : polynomialDegree <= 6 ? "medium" : "high";
  const complexityLevel = complexityKey === "good" ? "جيد" : complexityKey === "medium" ? "متوسط" : "مرتفع";
  const complexityWidth = Math.round((polynomialDegree / 10) * 100);
  const lrMax =
    mode === "linear" ? (linearVariant === "polynomial" ? 0.03 : 0.05) : logisticVariant === "linear" ? 0.2 : 0.12;

  return (
    <section className="reglab-panel reglab-controls">
      <div className="reglab-controls-title">
        <Cpu size={16} />
        <strong>أدوات التدريب</strong>
      </div>

      <div className="reglab-controls-grid">
        <label className="reglab-field">
          <span>نوع النموذج</span>
          <select value={mode} onChange={(event) => onModeChange(event.target.value)}>
            <option value="linear">انحدار خطي</option>
            <option value="logistic">انحدار لوجستي</option>
          </select>
        </label>

        <label className="reglab-field">
          <span>
            <Gauge size={14} />
            الخوارزمية
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
            دالة الخسارة
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
          <span>عائلة الانحدار</span>
          <div>
            <button
              type="button"
              className={linearVariant === "linear" ? "active" : ""}
              onClick={() => onLinearVariantChange("linear")}
            >
              خطي
            </button>
            <button
              type="button"
              className={linearVariant === "polynomial" ? "active" : ""}
              onClick={() => onLinearVariantChange("polynomial")}
            >
              متعدد الحدود
            </button>
          </div>
        </div>
      )}

      {mode === "logistic" && (
        <div className="reglab-variant">
          <span>تحويل ميزات اللوجستي</span>
          <div className="reglab-variant-3">
            <button
              type="button"
              className={logisticVariant === "linear" ? "active" : ""}
              onClick={() => onLogisticVariantChange("linear")}
            >
              خطي
            </button>
            <button
              type="button"
              className={logisticVariant === "polynomial" ? "active" : ""}
              onClick={() => onLogisticVariantChange("polynomial")}
            >
              متعدد الحدود
            </button>
            <button
              type="button"
              className={logisticVariant === "exponential" ? "active" : ""}
              onClick={() => onLogisticVariantChange("exponential")}
            >
              أسي
            </button>
          </div>
        </div>
      )}

      {mode === "linear" && linearVariant === "polynomial" && (
        <div className="reglab-controls-row">
          <label>
            الدرجة
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
              className={`reglab-complexity-fill ${complexityKey}`}
              style={{ width: `${complexityWidth}%` }}
            />
            <span>{complexityLevel}</span>
          </div>
        </div>
      )}

      {mode === "logistic" && logisticVariant === "polynomial" && (
        <div className="reglab-controls-row">
          <label>
            درجة اللوجستي
            <span className="reglab-mono">{logisticDegree}</span>
          </label>
          <input
            type="range"
            min="2"
            max="8"
            step="1"
            value={logisticDegree}
            onChange={(event) => onLogisticDegreeChange(parseInt(event.target.value, 10))}
          />
        </div>
      )}

      {mode === "logistic" && logisticVariant !== "linear" && (
        <div className="reglab-controls-row">
          <label>
            أبعاد الميزات
            <span className="reglab-mono">{logisticFeatureDims}</span>
          </label>
          <input
            type="range"
            min="4"
            max="24"
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
          معدل التعلم
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
          الخطوات لكل إطار
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
          <span>فئة النقر الأيسر</span>
          <div>
            <button
              type="button"
              className={selectedClass === 0 ? "active class0" : "class0"}
              onClick={() => onSelectedClassChange(0)}
            >
              الفئة 0
            </button>
            <button
              type="button"
              className={selectedClass === 1 ? "active class1" : "class1"}
              onClick={() => onSelectedClassChange(1)}
            >
              الفئة 1
            </button>
          </div>
          <small>النقر الأيمن يضيف الفئة المعاكسة.</small>
        </div>
      )}

      <div className="reglab-buttons">
        <button type="button" onClick={onToggleTraining} disabled={!canTrain} className="reglab-btn-primary">
          {isTraining ? <Pause size={15} /> : <Play size={15} />}
          {isTraining ? "إيقاف مؤقت" : "بدء"}
        </button>
        <button type="button" onClick={onResetModel}>
          <RotateCcw size={15} />
          إعادة ضبط النموذج
        </button>
        <button type="button" onClick={onClearPoints}>
          <Trash2 size={15} />
          مسح النقاط
        </button>
        <button type="button" onClick={onGenerateRandom}>
          <Shuffle size={15} />
          بيانات عشوائية
        </button>
      </div>

      <div className="reglab-stats">
        <p>
          الحقبة <span className="reglab-mono">{epoch}</span>
        </p>
        <p>
          النقاط <span className="reglab-mono">{pointsCount}</span>
        </p>
        {mode === "logistic" && (
          <p>
            الفئة 0 / الفئة 1{" "}
            <span className="reglab-mono">
              {classCounts[0]} / {classCounts[1]}
            </span>
          </p>
        )}
      </div>

      <button type="button" className="reglab-chat-toggle" onClick={onToggleChat}>
        <MessageSquare size={15} />
        إظهار/إخفاء الشات الذكي
      </button>

      <div className="reglab-micro-tip">
        <Sparkles size={14} />
        <span>يبدأ التدريب فقط عند الضغط على زر بدء.</span>
      </div>
    </section>
  );
}
