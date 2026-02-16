import { useUISettings } from "../../../context/UISettingsContext.jsx";
import StatChip from "./shared/StatChip.jsx";

function fmt(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(digits);
}

export default function NEATHeader({
  stats,
  isRunning,
  progress,
  viewOptions,
  onControl,
  onReplayIntro
}) {
  const { t } = useUISettings();
  const showToolRow = viewOptions?.showToolRow !== false;

  return (
    <header className="neat-header neat-header-v2">
      <div className="neat-header-row primary">
        <div className="neat-header-copy">
          <h3 className="neat-header-title">{t("مختبر NEAT التطوري", "NEAT Evolution Lab")}</h3>
          <p className="neat-header-subtitle">
            {t("تطور بنى الشبكات العصبية تلقائيًا عبر الأجيال", "Evolve neural topologies across generations")}
          </p>
        </div>

        <div className="neat-header-main-tools">
          <div className="control-group primary-controls">
            <button
              type="button"
              className="ctrl-btn icon"
              onClick={() => onControl?.("reset_network")}
              title={t("إعادة الشبكة من الصفر", "Reset Network")}
            >
              ↺
            </button>
            <button
              type="button"
              className="ctrl-btn"
              onClick={() => onControl?.("step")}
              disabled={isRunning}
            >
              ⏭ {t("جيل", "Step")}
            </button>
            <button
              type="button"
              className={`ctrl-btn primary ${isRunning ? "running" : ""}`.trim()}
              onClick={() => onControl?.(isRunning ? "pause" : "run")}
            >
              {isRunning ? `⏸ ${t("إيقاف", "Pause")}` : `▶ ${t("تشغيل", "Run")}`}
            </button>
          </div>

          <div className="stat-chips stat-chips-compact">
            <StatChip label={t("جيل", "Gen")} value={stats?.gen ?? 0} pulse={isRunning} />
            <StatChip label={t("أفضل", "Best")} value={fmt(stats?.best)} />
            <StatChip label={t("متوسط", "Avg")} value={fmt(stats?.avg)} />
            <StatChip label={t("أنواع", "Species")} value={stats?.species ?? 0} />
            <StatChip label={t("عقد", "Nodes")} value={stats?.nodes ?? 0} />
            <StatChip label={t("وصلات", "Conns")} value={stats?.conns ?? 0} />
          </div>
        </div>
      </div>

      {showToolRow ? (
        <div className="neat-header-row secondary">
          <div className="control-group secondary-controls">
            <span className="secondary-title">👁 {t("العرض", "Display")}</span>
            <button
              type="button"
              className={`ctrl-btn small ${viewOptions?.showHud === false ? "muted" : ""}`.trim()}
              onClick={() => onControl?.("toggle_hud")}
            >
              {viewOptions?.showHud === false ? t("إظهار HUD", "Show HUD") : t("HUD", "HUD")}
            </button>
            <button
              type="button"
              className={`ctrl-btn small ${viewOptions?.showExplanations === false ? "muted" : ""}`.trim()}
              onClick={() => onControl?.("toggle_help")}
            >
              {viewOptions?.showExplanations === false ? t("إظهار الشرح", "Show Explain") : t("الشرح", "Explain")}
            </button>
            <button
              type="button"
              className={`ctrl-btn small ${viewOptions?.showSidePanels === false ? "muted" : ""}`.trim()}
              onClick={() => onControl?.("toggle_panels")}
            >
              {viewOptions?.showSidePanels === false ? t("إظهار اللوحات", "Show Panels") : t("اللوحات", "Panels")}
            </button>
          </div>

          <div className="control-group secondary-actions">
            <div className="neat-progress" title={t("تقدم التقييم داخل الجيل", "Generation evaluation progress")}> 
              <span style={{ width: `${Math.max(0, Math.min(100, Math.round((progress || 0) * 100)))}%` }} />
            </div>
            <button type="button" className="ctrl-btn small" onClick={onReplayIntro}>
              {t("المقدمة", "Intro")}
            </button>
            <button type="button" className="ctrl-btn small" onClick={() => onControl?.("reset_network")}> 
              {t("إعادة الشبكة", "Reset Network")}
            </button>
            <button type="button" className="ctrl-btn small" onClick={() => onControl?.("toggle_tool_row")}>
              {t("إخفاء الأدوات", "Hide Tools")}
            </button>
          </div>
        </div>
      ) : (
        <div className="neat-header-row secondary collapsed">
          <button type="button" className="ctrl-btn small" onClick={() => onControl?.("toggle_tool_row")}>
            {t("إظهار أدوات العرض", "Show Display Tools")}
          </button>
          <div className="neat-progress" title={t("تقدم التقييم داخل الجيل", "Generation evaluation progress")}> 
            <span style={{ width: `${Math.max(0, Math.min(100, Math.round((progress || 0) * 100)))}%` }} />
          </div>
        </div>
      )}
    </header>
  );
}
