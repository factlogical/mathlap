import { useUISettings } from "../../../context/UISettingsContext.jsx";

const PRESET_IDS = ["fast", "balanced", "quality"];

const PRESET_LABELS = {
  fast: { ar: "⚡ سريع", en: "⚡ Fast" },
  balanced: { ar: "⚖️ متوازن", en: "⚖️ Balanced" },
  quality: { ar: "🎯 جودة", en: "🎯 Quality" }
};

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  hint,
  disabled,
  formatValue,
  onChange
}) {
  return (
    <label className="algo-control">
      <div className="algo-control-head">
        <span>{label}</span>
        <strong>{formatValue ? formatValue(value) : value}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(Number(event.target.value))}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default function AlgorithmControls({
  config,
  isRunning,
  viewOptions,
  onChange,
  onViewOptionChange,
  onApplyPreset,
  onResetNetwork
}) {
  const { isArabic, t } = useUISettings();

  return (
    <div className="view-settings view-enter">
      <div className="settings-layout">
        <section className="dashboard-card">
          <h4>{t("إعدادات الخوارزمية", "Algorithm Settings")}</h4>
          <div className="algo-grid">
            <ControlSlider
              label={t("حجم المجتمع", "Population Size")}
              value={config.populationSize}
              min={20}
              max={500}
              step={10}
              disabled={isRunning}
              hint={t("أكبر = تنوع أعلى لكن أبطأ", "Larger = more diversity but slower")}
              onChange={(value) => onChange?.("populationSize", value)}
            />

            <ControlSlider
              label={t("طفرة الأوزان", "Weight Mutation")}
              value={config.weightMutationRate}
              min={0}
              max={1}
              step={0.01}
              disabled={isRunning}
              formatValue={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => onChange?.("weightMutationRate", value)}
            />

            <ControlSlider
              label={t("إضافة وصلة", "Add Connection")}
              value={config.addConnectionRate}
              min={0}
              max={0.5}
              step={0.005}
              disabled={isRunning}
              formatValue={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => onChange?.("addConnectionRate", value)}
            />

            <ControlSlider
              label={t("إضافة عقدة", "Add Node")}
              value={config.addNodeRate}
              min={0}
              max={0.1}
              step={0.002}
              disabled={isRunning}
              formatValue={(value) => `${(value * 100).toFixed(1)}%`}
              onChange={(value) => onChange?.("addNodeRate", value)}
            />

            <ControlSlider
              label={t("عتبة التوافق δ", "Compatibility Threshold δ")}
              value={config.compatibilityThreshold}
              min={0.5}
              max={6}
              step={0.1}
              disabled={isRunning}
              hint={t("أصغر = أنواع أكثر", "Lower = more species")}
              onChange={(value) => onChange?.("compatibilityThreshold", value)}
            />

            <ControlSlider
              label={t("نسبة البقاء", "Survival Rate")}
              value={config.survivalRate}
              min={0.1}
              max={0.5}
              step={0.01}
              disabled={isRunning}
              formatValue={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => onChange?.("survivalRate", value)}
            />

            <ControlSlider
              label={t("إطارات اللعب للتقييم", "Eval Frames")}
              value={config.maxStepsPerEval}
              min={160}
              max={3000}
              step={40}
              disabled={isRunning}
              hint={t("أكبر = طيران أطول لكن أبطأ", "Higher = longer flight but slower generations")}
              onChange={(value) => onChange?.("maxStepsPerEval", value)}
            />

            <ControlSlider
              label={t("حد ركود النوع", "Species Stale Limit")}
              value={config.maxStaleGenerations}
              min={3}
              max={60}
              step={1}
              disabled={isRunning}
              onChange={(value) => onChange?.("maxStaleGenerations", value)}
            />
          </div>
        </section>

        <section className="dashboard-card">
          <h4>{t("خيارات إضافية", "Additional Options")}</h4>

          <div className="algo-select-group">
            <label htmlFor="neat-link-mode-select">{t("نوع الروابط", "Connection Mode")}</label>
            <select
              id="neat-link-mode-select"
              value={config.allowRecurrent ? "recurrent" : "feedforward"}
              disabled={isRunning}
              onChange={(event) => onChange?.("allowRecurrent", event.target.value === "recurrent")}
            >
              <option value="feedforward">{t("أمامية فقط (بدون دورات)", "Feed-forward only (acyclic)")}</option>
              <option value="recurrent">{t("متكررة (تجريبي)", "Recurrent (experimental)")}</option>
            </select>
          </div>

          <div className="algo-select-group">
            <label htmlFor="neat-activation-select">{t("دالة التفعيل", "Activation")}</label>
            <select
              id="neat-activation-select"
              value={config.activation}
              disabled={isRunning}
              onChange={(event) => onChange?.("activation", event.target.value)}
            >
              <option value="tanh">tanh</option>
              <option value="sigmoid">sigmoid</option>
              <option value="relu">relu</option>
              <option value="sin">sin</option>
            </select>
          </div>

          <div className="algo-select-group">
            <label htmlFor="neat-crossover-rate">{t("احتمال التهجين", "Crossover Rate")}</label>
            <input
              id="neat-crossover-rate"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={config.crossoverRate}
              disabled={isRunning}
              onChange={(event) => onChange?.("crossoverRate", Number(event.target.value))}
            />
          </div>

          <div className="algo-select-group">
            <label htmlFor="neat-inter-species-rate">{t("تهجين بين الأنواع", "Inter-Species Mate")}</label>
            <input
              id="neat-inter-species-rate"
              type="number"
              min={0}
              max={0.3}
              step={0.001}
              value={config.interSpeciesMateRate}
              disabled={isRunning}
              onChange={(event) => onChange?.("interSpeciesMateRate", Number(event.target.value))}
            />
          </div>

          <div className="algo-presets">
            <p>{t("إعدادات جاهزة", "Presets")}</p>
            <div className="algo-presets-row">
              {PRESET_IDS.map((presetId) => (
                <button
                  key={presetId}
                  type="button"
                  className="mini-btn"
                  disabled={isRunning}
                  onClick={() => onApplyPreset?.(presetId)}
                >
                  {isArabic ? PRESET_LABELS[presetId].ar : PRESET_LABELS[presetId].en}
                </button>
              ))}
            </div>
          </div>

          <div className="algo-presets" style={{ marginTop: "0.55rem" }}>
            <p>{t("إدارة التعلم", "Training Control")}</p>
            <div className="algo-presets-row">
              <button
                type="button"
                className="mini-btn"
                disabled={isRunning}
                onClick={() => onResetNetwork?.()}
              >
                {t("إعادة الشبكة من الصفر", "Reset Network From Scratch")}
              </button>
            </div>
          </div>

          <div className="algo-presets" style={{ marginTop: "0.75rem" }}>
            <p>{t("عرض الواجهة", "Display Options")}</p>
            <div className="algo-toggle-group">
              <label className="algo-toggle">
                <input
                  type="checkbox"
                  checked={viewOptions?.showSidePanels !== false}
                  onChange={(event) => onViewOptionChange?.("showSidePanels", event.target.checked)}
                />
                <span>{t("إظهار اللوحات الجانبية", "Show Side Panels")}</span>
              </label>
              <label className="algo-toggle">
                <input
                  type="checkbox"
                  checked={viewOptions?.showHud !== false}
                  onChange={(event) => onViewOptionChange?.("showHud", event.target.checked)}
                />
                <span>{t("إظهار HUD داخل البيئة", "Show Environment HUD")}</span>
              </label>
              <label className="algo-toggle">
                <input
                  type="checkbox"
                  checked={viewOptions?.showSpeciesMap !== false}
                  onChange={(event) => onViewOptionChange?.("showSpeciesMap", event.target.checked)}
                />
                <span>{t("إظهار خريطة الأنواع", "Show Species Map")}</span>
              </label>
              <label className="algo-toggle">
                <input
                  type="checkbox"
                  checked={viewOptions?.showExplanations !== false}
                  onChange={(event) => onViewOptionChange?.("showExplanations", event.target.checked)}
                />
                <span>{t("إظهار بطاقات الشرح", "Show Explanation Cards")}</span>
              </label>
              <label className="algo-toggle">
                <input
                  type="checkbox"
                  checked={viewOptions?.showToolRow !== false}
                  onChange={(event) => onViewOptionChange?.("showToolRow", event.target.checked)}
                />
                <span>{t("إظهار شريط الأدوات الثانوي", "Show Secondary Tool Row")}</span>
              </label>
            </div>
          </div>

          {isRunning && (
            <p className="algo-warning">
              {t("أوقف التشغيل أولًا لتعديل الإعدادات", "Pause run before changing settings")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
