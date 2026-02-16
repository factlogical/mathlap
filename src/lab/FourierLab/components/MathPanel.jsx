import { useMemo, useState } from "react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";

const TERM_COLORS = ["#22d3ee", "#34d399", "#f59e0b", "#f97316", "#a78bfa", "#38bdf8"];

function formatNumber(value, digits = 3) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(digits);
}

export default function MathPanel({ terms = [], t }) {
  const [showFullEquation, setShowFullEquation] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);

  const totalAmplitude = useMemo(
    () => terms.reduce((sum, term) => sum + Math.abs(term.amplitude || 0), 0) || 1,
    [terms]
  );

  const dominantTerm = useMemo(() => {
    if (!terms.length) return null;
    return terms.reduce((best, term) => (Math.abs(term.amplitude || 0) > Math.abs(best.amplitude || 0) ? term : best), terms[0]);
  }, [terms]);

  const canonicalEquation = useMemo(() => {
    if (!terms.length) return String.raw`f(t)=0`;
    return String.raw`f(t)=\sum_{k=1}^{${Math.max(1, terms.length)}}A_k\cos(2\pi f_k t+\phi_k)`;
  }, [terms.length]);

  const equationTerms = useMemo(() => {
    const list = showFullEquation ? terms : terms.slice(0, 5);
    if (!list.length) return [];
    return list.map((term, index) => {
      const amp = formatNumber(term.amplitude, 3);
      const freq = formatNumber(term.freq, 2);
      const phase = formatNumber(term.phase, 2);
      return {
        key: `${term.freq}-${index}`,
        color: TERM_COLORS[index % TERM_COLORS.length],
        text: `${amp}cos(2π·${freq}·t + ${phase})`
      };
    });
  }, [showFullEquation, terms]);

  return (
    <section className="fourier-panel fourier-math-panel">
      <header className="fourier-panel-head">
        <h3>{t("ما يحدث رياضياً", "Math View")}</h3>
      </header>

      {!terms.length ? (
        <p className="fourier-help-text">
          {t("لا توجد ترددات نشطة بعد. ارسم شكلاً أو فعّل ترددات من الطيف.", "No active frequencies yet. Draw a shape or enable frequencies from the spectrum.")}
        </p>
      ) : (
        <>
          <div className="fourier-math-summary">
            <span className="fourier-chip">
              {t("ترددات نشطة", "Active Terms")}: {terms.length}
            </span>
            {dominantTerm ? (
              <span className="fourier-chip">
                {t("الأقوى", "Dominant")}: {formatNumber(dominantTerm.freq, 2)}
              </span>
            ) : null}
          </div>

          <div className="fourier-equation-katex">
            <BlockMath math={canonicalEquation} throwOnError={false} />
          </div>

          <div className="fourier-equation-box">
            <code className="fourier-equation-rich">
              <span className="fourier-equation-prefix">f(t) = </span>
              {equationTerms.map((term, index) => (
                <span key={term.key} className="fourier-equation-term" style={{ color: term.color }}>
                  {index > 0 ? " + " : ""}
                  {term.text}
                </span>
              ))}
              {!showFullEquation && terms.length > 5 ? <span className="fourier-equation-rest"> + ...</span> : null}
            </code>
          </div>

          <div className="fourier-math-terms">
            {terms.slice(0, 6).map((term, index) => {
              const termColor = TERM_COLORS[index % TERM_COLORS.length];
              const contribution = ((Math.abs(term.amplitude || 0) / totalAmplitude) * 100).toFixed(1);
              return (
                <div className="fourier-math-term" key={`${term.freq}-${index}`}>
                  <div className="fourier-math-term-meta">
                    <strong style={{ color: termColor }}>
                      {t("التردد", "Freq")} {formatNumber(term.freq, 1)}
                    </strong>
                    <span>A={formatNumber(term.amplitude, 3)} • φ={formatNumber(term.phase, 2)}</span>
                    <span>{contribution}%</span>
                  </div>
                  <div className="fourier-math-bar">
                    <span style={{ width: `${Math.max(6, Number(contribution))}%`, background: termColor }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fourier-math-actions">
            <button type="button" className="fourier-chip-btn" onClick={() => setShowFullEquation((prev) => !prev)}>
              {showFullEquation ? t("إخفاء المعادلة الكاملة", "Hide Full Equation") : t("عرض المعادلة الكاملة", "Show Full Equation")}
            </button>
            <button type="button" className="fourier-chip-btn" onClick={() => setShowDerivative(true)}>
              {t("عرض الاشتقاق", "Show Derivation")}
            </button>
          </div>
        </>
      )}

      {showDerivative && (
        <div className="fourier-math-modal" role="dialog" aria-modal="true">
          <div className="fourier-math-modal-card">
            <h4>{t("اشتقاق مبسط", "Simplified Derivation")}</h4>
            <BlockMath math={String.raw`\frac{d}{dt}\left[A\cos(2\pi ft+\phi)\right]=-A(2\pi f)\sin(2\pi ft+\phi)`} throwOnError={false} />
            <p>
              {t(
                "وبالتالي: مشتقة الإشارة الكاملة هي مجموع مشتقات جميع المركبات الترددية.",
                "Therefore, the derivative of the full signal is the sum of derivatives of all frequency components."
              )}
            </p>
            <p className="fourier-math-inline-eq">
              <InlineMath math={String.raw`f'(t)=\sum_k -A_k(2\pi f_k)\sin(2\pi f_k t+\phi_k)`} throwOnError={false} />
            </p>
            <button type="button" className="fourier-btn" onClick={() => setShowDerivative(false)}>
              {t("إغلاق", "Close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
