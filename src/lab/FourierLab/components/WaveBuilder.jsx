import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

const PRESETS = {
  square: [
    { freq: 1, amp: 1.0, phase: 0 },
    { freq: 3, amp: 1 / 3, phase: 0 },
    { freq: 5, amp: 1 / 5, phase: 0 },
    { freq: 7, amp: 1 / 7, phase: 0 }
  ],
  sawtooth: [
    { freq: 1, amp: 1.0, phase: 0 },
    { freq: 2, amp: 0.5, phase: Math.PI / 2 },
    { freq: 3, amp: 1 / 3, phase: Math.PI / 2 },
    { freq: 4, amp: 0.25, phase: Math.PI / 2 }
  ],
  triangle: [
    { freq: 1, amp: 1.0, phase: 0 },
    { freq: 3, amp: 1 / 9, phase: Math.PI },
    { freq: 5, amp: 1 / 25, phase: 0 },
    { freq: 7, amp: 1 / 49, phase: Math.PI }
  ]
};

const COLORS = ["#38bdf8", "#22d3ee", "#f59e0b", "#f97316", "#a78bfa", "#34d399"];

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(10, Math.floor(rect.width * dpr));
  canvas.height = Math.max(10, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { ctx, w: rect.width, h: rect.height };
}

function nextId(components) {
  return components.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export default function WaveBuilder({ t }) {
  const [components, setComponents] = useState([
    { id: 1, freq: 1, amp: 1, phase: 0, color: COLORS[0] },
    { id: 2, freq: 3, amp: 0.33, phase: 0, color: COLORS[1] }
  ]);
  const canvasRef = useRef(null);

  const sampled = useMemo(() => {
    const N = 420;
    const out = [];
    for (let i = 0; i < N; i += 1) {
      const x = (i / (N - 1)) * Math.PI * 2;
      let y = 0;
      for (const c of components) y += c.amp * Math.sin(c.freq * x + c.phase);
      out.push({ x, y });
    }
    return out;
  }, [components]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.fillStyle = "#071126";
    ctx.fillRect(0, 0, w, h);

    const top = h * 0.16;
    const bottom = h * 0.88;
    const left = 28;
    const right = w - 14;
    const rangeY = Math.max(2.2, sampled.reduce((m, p) => Math.max(m, Math.abs(p.y)), 0) * 1.35);

    ctx.strokeStyle = "rgba(148,163,184,0.2)";
    for (let gy = 0; gy <= 8; gy += 1) {
      const y = top + ((bottom - top) * gy) / 8;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    for (let gx = 0; gx <= 10; gx += 1) {
      const x = left + ((right - left) * gx) / 10;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    sampled.forEach((p, idx) => {
      const x = left + ((right - left) * p.x) / (Math.PI * 2);
      const y = top + ((bottom - top) * (rangeY - p.y)) / (rangeY * 2);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [sampled]);

  const update = (id, field, value) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: Number(value) } : c)));
  };

  const addComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        id: nextId(prev),
        freq: 1,
        amp: 0.2,
        phase: 0,
        color: COLORS[prev.length % COLORS.length]
      }
    ]);
  };

  const removeComponent = (id) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const applyPreset = (presetKey) => {
    const base = PRESETS[presetKey] || PRESETS.square;
    setComponents(
      base.map((item, idx) => ({
        id: idx + 1,
        freq: item.freq,
        amp: item.amp,
        phase: item.phase,
        color: COLORS[idx % COLORS.length]
      }))
    );
  };

  const reset = () => {
    setComponents([
      { id: 1, freq: 1, amp: 1, phase: 0, color: COLORS[0] },
      { id: 2, freq: 3, amp: 0.33, phase: 0, color: COLORS[1] }
    ]);
  };

  return (
    <section className="fourier-builder">
      <div className="fourier-builder-top">
        <h3>{t("بناء موجة من مركبات جيبية", "Build Wave from Sinusoids")}</h3>
        <div className="fourier-btn-row">
          <button type="button" className="fourier-btn" onClick={addComponent}>
            <Plus size={16} />
            <span>{t("إضافة تردد", "Add Frequency")}</span>
          </button>
          <button type="button" className="fourier-btn" onClick={reset}>
            <RotateCcw size={16} />
            <span>{t("إعادة تعيين", "Reset")}</span>
          </button>
        </div>
      </div>

      <div className="fourier-preset-row">
        <button type="button" className="fourier-chip-btn" onClick={() => applyPreset("square")}>
          {t("موجة مربعة", "Square Wave")}
        </button>
        <button type="button" className="fourier-chip-btn" onClick={() => applyPreset("sawtooth")}>
          {t("سن منشار", "Sawtooth")}
        </button>
        <button type="button" className="fourier-chip-btn" onClick={() => applyPreset("triangle")}>
          {t("موجة مثلثية", "Triangle")}
        </button>
      </div>

      <canvas ref={canvasRef} className="fourier-builder-canvas" />

      <div className="fourier-components">
        {components.map((c) => (
          <div className="fourier-component-card" key={c.id}>
            <div className="fourier-component-head">
              <strong style={{ color: c.color }}>
                {t("مركب", "Term")} #{c.id}
              </strong>
              <button type="button" className="fourier-icon-btn" onClick={() => removeComponent(c.id)}>
                <Trash2 size={14} />
              </button>
            </div>
            <label>
              {t("التردد", "Frequency")}: {c.freq.toFixed(1)}
            </label>
            <input type="range" min="1" max="20" step="0.1" value={c.freq} onChange={(e) => update(c.id, "freq", e.target.value)} />
            <label>
              {t("السعة", "Amplitude")}: {c.amp.toFixed(2)}
            </label>
            <input type="range" min="0" max="2" step="0.01" value={c.amp} onChange={(e) => update(c.id, "amp", e.target.value)} />
            <label>
              {t("الطور", "Phase")}: {c.phase.toFixed(2)}
            </label>
            <input type="range" min={-Math.PI} max={Math.PI} step="0.01" value={c.phase} onChange={(e) => update(c.id, "phase", e.target.value)} />
          </div>
        ))}
      </div>
    </section>
  );
}

