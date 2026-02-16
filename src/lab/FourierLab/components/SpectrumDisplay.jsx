import { useMemo } from "react";

export default function SpectrumDisplay({
  coefficients = [],
  numFreqs = 0,
  disabledIndices = new Set(),
  onNumFreqsChange,
  onToggleIndex,
  t
}) {
  const top = useMemo(() => coefficients.slice(0, 64), [coefficients]);
  const maxAmp = useMemo(() => Math.max(...top.map((item) => item.amplitude), 1e-6), [top]);
  const totalAmplitude = useMemo(
    () => top.reduce((sum, item) => sum + Math.abs(item.amplitude || 0), 0) || 1,
    [top]
  );

  if (!coefficients.length) {
    return (
      <section className="fourier-panel">
        <header className="fourier-panel-head">
          <h3>{t("طيف الترددات", "Frequency Spectrum")}</h3>
        </header>
        <div className="fourier-empty">{t("لم يتم تحليل إشارة بعد.", "No analyzed signal yet.")}</div>
      </section>
    );
  }

  const ratio = ((numFreqs / coefficients.length) * 100).toFixed(0);
  return (
    <section className="fourier-panel">
      <header className="fourier-panel-head">
        <h3>{t("طيف الترددات", "Frequency Spectrum")}</h3>
        <span className="fourier-chip">
          {numFreqs}/{coefficients.length}
        </span>
      </header>

      <div className="fourier-meta">
        <span>{t("الدقة", "Accuracy")}: {ratio}%</span>
      </div>

      <input
        type="range"
        min={1}
        max={coefficients.length}
        value={Math.max(1, Math.min(numFreqs, coefficients.length))}
        onChange={(event) => onNumFreqsChange?.(Number(event.target.value))}
        className="fourier-slider"
      />

      <div className="fourier-spectrum-bars">
        {top.map((item, idx) => {
          const inRange = idx < numFreqs;
          const isDisabled = inRange && disabledIndices.has(idx);
          const isActive = inRange && !isDisabled;
          const height = Math.max(6, (item.amplitude / maxAmp) * 100);
          const contribution = ((Math.abs(item.amplitude || 0) / totalAmplitude) * 100).toFixed(1);

          return (
            <button
              key={`${item.freq}-${idx}`}
              type="button"
              className={`fourier-spectrum-bar ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
              style={{ height: `${height}%` }}
              onClick={() => onToggleIndex?.(idx)}
              title={`${t("تردد", "Freq")} ${item.freq} • ${t("سعة", "Amp")} ${item.amplitude.toFixed(3)} • ${t("طور", "Phase")} ${item.phase.toFixed(2)} • ${contribution}%`}
            />
          );
        })}
      </div>
    </section>
  );
}

