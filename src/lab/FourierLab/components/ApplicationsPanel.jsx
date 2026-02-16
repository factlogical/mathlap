import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Music } from "lucide-react";
import { AudioEngine } from "../utils/audioEngine";
import { computeDFT } from "../utils/dft";

const NOTE_MAP = [
  { label: "C4", freq: 261.63 },
  { label: "D4", freq: 293.66 },
  { label: "E4", freq: 329.63 },
  { label: "F4", freq: 349.23 },
  { label: "G4", freq: 392.0 },
  { label: "A4", freq: 440.0 },
  { label: "B4", freq: 493.88 }
];

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

function drawBars(canvas, bars) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.fillStyle = "#071126";
  ctx.fillRect(0, 0, w, h);
  if (!bars.length) return;

  const step = Math.max(2, Math.floor(bars.length / 48));
  const grouped = [];
  for (let i = 0; i < bars.length; i += step) {
    grouped.push(bars.slice(i, i + step).reduce((s, v) => s + v, 0) / step);
  }
  const max = Math.max(...grouped, 1);
  const barW = w / grouped.length;
  grouped.forEach((v, i) => {
    const ratio = v / max;
    const height = ratio * (h - 8);
    const x = i * barW;
    ctx.fillStyle = `hsl(${190 + ratio * 70}, 85%, ${42 + ratio * 20}%)`;
    ctx.fillRect(x, h - height, Math.max(1, barW - 1), height);
  });
}

function drawSignalComparison(canvas, original, rebuilt) {
  const { ctx, w, h } = setupCanvas(canvas);

  ctx.fillStyle = "#071126";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(148,163,184,0.2)";
  for (let i = 0; i <= 8; i += 1) {
    const y = (h * i) / 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const max = Math.max(1, ...original.map((v) => Math.abs(v)), ...rebuilt.map((v) => Math.abs(v)));
  const toY = (value) => h / 2 - (value / max) * (h * 0.42);
  const toX = (idx, N) => (idx / (N - 1)) * w;

  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  original.forEach((v, i) => {
    const x = toX(i, original.length);
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  rebuilt.forEach((v, i) => {
    const x = toX(i, rebuilt.length);
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export default function ApplicationsPanel({ t }) {
  const [tab, setTab] = useState("audio");
  const [micOn, setMicOn] = useState(false);
  const [quality, setQuality] = useState(22);
  const [lastNote, setLastNote] = useState(null);
  const audioRef = useRef(null);
  const barsCanvasRef = useRef(null);
  const compressionCanvasRef = useRef(null);
  const rafRef = useRef(0);

  if (!audioRef.current && typeof window !== "undefined") {
    audioRef.current = new AudioEngine();
  }

  const compressionSignal = useMemo(() => {
    const N = 256;
    const signal = [];
    for (let i = 0; i < N; i += 1) {
      const x = (i / N) * Math.PI * 2;
      signal.push(
        1.2 * Math.sin(x) + 0.5 * Math.sin(3 * x) + 0.25 * Math.sin(8 * x + 0.5) + 0.12 * Math.cos(14 * x)
      );
    }
    return signal;
  }, []);

  const rebuiltSignal = useMemo(() => {
    const dft = computeDFT(compressionSignal);
    const keep = Math.max(1, Math.floor((quality / 100) * dft.length));
    const top = dft.slice(0, keep);
    const N = compressionSignal.length;
    const rebuilt = [];
    for (let n = 0; n < N; n += 1) {
      let value = 0;
      for (const c of top) {
        const angle = (2 * Math.PI * c.freq * n) / N + c.phase;
        value += c.amplitude * Math.cos(angle);
      }
      rebuilt.push(value * 2);
    }
    return rebuilt;
  }, [compressionSignal, quality]);

  useEffect(() => {
    const canvas = compressionCanvasRef.current;
    if (!canvas) return;
    drawSignalComparison(canvas, compressionSignal, rebuiltSignal);
  }, [compressionSignal, rebuiltSignal]);

  useEffect(() => {
    if (!micOn) {
      cancelAnimationFrame(rafRef.current);
      const canvas = barsCanvasRef.current;
      if (canvas) drawBars(canvas, []);
      return undefined;
    }

    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const data = audioRef.current?.getFrequencyData() || [];
      const canvas = barsCanvasRef.current;
      if (canvas) drawBars(canvas, Array.from(data));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [micOn]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.stopMicrophone();
  }, []);

  const toggleMic = async () => {
    if (!micOn) {
      try {
        await audioRef.current.startMicrophone();
        setMicOn(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
      }
      return;
    }
    audioRef.current.stopMicrophone();
    setMicOn(false);
  };

  const playNote = async (note) => {
    await audioRef.current.playTone(note.freq, 0.4);
    setLastNote(note);
  };

  return (
    <section className="fourier-apps">
      <header className="fourier-panel-head">
        <h3>{t("تطبيقات فورييه في الواقع", "Fourier in Real Applications")}</h3>
      </header>

      <div className="fourier-tab-row">
        <button type="button" className={`fourier-tab-btn ${tab === "audio" ? "active" : ""}`} onClick={() => setTab("audio")}>
          {t("الصوت الحي", "Live Audio")}
        </button>
        <button type="button" className={`fourier-tab-btn ${tab === "compression" ? "active" : ""}`} onClick={() => setTab("compression")}>
          {t("ضغط الإشارة", "Compression")}
        </button>
        <button type="button" className={`fourier-tab-btn ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
          {t("النغمات", "Notes")}
        </button>
      </div>

      {tab === "audio" && (
        <div className="fourier-app-card">
          <button type="button" className={`fourier-btn ${micOn ? "danger" : ""}`} onClick={toggleMic}>
            {micOn ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{micOn ? t("إيقاف الميكروفون", "Stop Microphone") : t("تشغيل الميكروفون", "Use Microphone")}</span>
          </button>
          <canvas ref={barsCanvasRef} className="fourier-mini-canvas" />
        </div>
      )}

      {tab === "compression" && (
        <div className="fourier-app-card">
          <label>
            {t("جودة الاحتفاظ بالترددات", "Frequency Retention Quality")}: {quality}%
          </label>
          <input type="range" min="2" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
          <canvas ref={compressionCanvasRef} className="fourier-mini-canvas" />
          <p className="fourier-help-text">
            {t("خفض الجودة يقلل عدد الترددات المحتفظ بها، وهذا يشبه ضغط MP3/JPEG.", "Lower quality keeps fewer frequencies, similar to MP3/JPEG compression.")}
          </p>
        </div>
      )}

      {tab === "notes" && (
        <div className="fourier-app-card">
          <div className="fourier-note-grid">
            {NOTE_MAP.map((note) => (
              <button key={note.label} type="button" className="fourier-note-btn" onClick={() => playNote(note)}>
                <Music size={14} />
                <span>{note.label}</span>
                <small>{note.freq.toFixed(0)} Hz</small>
              </button>
            ))}
          </div>
          {lastNote && (
            <div className="fourier-note-status">
              {t("آخر نغمة", "Last Note")}: {lastNote.label} ({lastNote.freq.toFixed(2)} Hz)
            </div>
          )}
        </div>
      )}
    </section>
  );
}

