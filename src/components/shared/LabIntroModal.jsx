import { useEffect, useMemo, useRef, useState } from "react";
import "./LabIntroModal.css";

const CANVAS_VISUALS = new Set([
  "wave",
  "network",
  "layers",
  "activation",
  "loss",
  "gradient",
  "regression",
  "scatter",
  "overfit",
  "decision",
  "neuroevolution",
  "limit",
  "derivative",
  "topology"
]);

function resolveText(value, isArabic) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (isArabic && typeof value.ar === "string") return value.ar;
    if (!isArabic && typeof value.en === "string") return value.en;
    if (typeof value.ar === "string") return value.ar;
    if (typeof value.en === "string") return value.en;
  }
  return String(value);
}

function introStorageKey(labId) {
  return `${labId}_intro_seen`;
}

function seededNoise(i, offset = 0) {
  const x = Math.sin((i + 1) * 12.9898 + offset * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function IntroCanvasVisual({ type }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!CANVAS_VISUALS.has(type)) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };

    const drawGrid = (w, h) => {
      ctx.strokeStyle = "rgba(115, 145, 190, 0.16)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    const drawWave = (w, h, t) => {
      drawGrid(w, h);
      const active = 1 + Math.floor((t / 1000) % 5);
      const freqs = [1, 3, 5, 7, 9].slice(0, active);
      const palette = ["#34d39988", "#60a5fa88", "#a78bfa88", "#fbbf2488", "#f472b688"];
      const centerY = h * 0.54;
      const amp = h * 0.24;

      freqs.forEach((f, i) => {
        ctx.strokeStyle = palette[i % palette.length];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= w; x++) {
          const p = (x / w) * Math.PI * 2;
          const y = centerY - (amp / f) * Math.sin(f * p);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      if (freqs.length > 0) {
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2.7;
        ctx.shadowColor = "#fb923c";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let x = 0; x <= w; x++) {
          const p = (x / w) * Math.PI * 2;
          const y = centerY - freqs.reduce((sum, f) => sum + (amp / f) * Math.sin(f * p), 0);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const drawNetwork = (w, h, t) => {
      drawGrid(w, h);
      const pulse = 0.35 + 0.65 * ((Math.sin(t / 520) + 1) * 0.5);
      const cols = [
        [{ x: 54, y: h * 0.3 }, { x: 54, y: h * 0.72 }],
        Array.from({ length: 4 }, (_, i) => ({ x: w * 0.45, y: h * (0.18 + i * 0.22) })),
        [{ x: w - 54, y: h * 0.5 }]
      ];

      ctx.lineWidth = 1.6;
      cols[0].forEach((a, i) => {
        cols[1].forEach((b, j) => {
          ctx.strokeStyle = i % 2 === j % 2 ? "rgba(96,165,250,0.35)" : "rgba(251,191,36,0.24)";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        });
      });

      cols[1].forEach((a, i) => {
        const b = cols[2][0];
        ctx.strokeStyle = i % 2 === 0 ? "rgba(167,139,250,0.34)" : "rgba(52,211,153,0.25)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      const nodes = [...cols[0], ...cols[1], ...cols[2]];
      nodes.forEach((node, i) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, i < 2 ? 12 : i === nodes.length - 1 ? 14 : 10, 0, Math.PI * 2);
        ctx.fillStyle = i < 2 ? "#22d3ee" : i === nodes.length - 1 ? "#34d399" : "#a855f7";
        ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(219, 234, 254, 0.65)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    };

    const drawRegression = (w, h, t) => {
      drawGrid(w, h);
      const points = Array.from({ length: 24 }, (_, i) => {
        const x = (seededNoise(i, 1) - 0.5) * 2.2;
        const y = 0.95 * x + 0.15 + (seededNoise(i, 2) - 0.5) * 0.55;
        return { x, y };
      });
      const toX = (x) => ((x + 1.2) / 2.4) * w;
      const toY = (y) => h - ((y + 1.2) / 2.4) * h;
      const fit = (Math.sin(t / 950) + 1) * 0.5;
      const slope = -0.2 + fit * 1.22;
      const intercept = 0.35 - fit * 0.15;

      points.forEach((p) => {
        const cx = toX(p.x);
        const cy = toY(p.y);
        const py = toY(slope * p.x + intercept);
        ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, py);
        ctx.stroke();
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = -1.2; x <= 1.2; x += 0.02) {
        const cx = toX(x);
        const cy = toY(slope * x + intercept);
        if (x === -1.2) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawScatter = (w, h) => {
      drawGrid(w, h);
      const points = Array.from({ length: 30 }, (_, i) => {
        const x = (seededNoise(i, 21) - 0.5) * 2.2;
        const y = 0.75 * x + 0.2 + (seededNoise(i, 22) - 0.5) * 0.95;
        return { x, y };
      });
      const toX = (x) => ((x + 1.2) / 2.4) * w;
      const toY = (y) => h - ((y + 1.2) / 2.4) * h;
      points.forEach((p) => {
        ctx.fillStyle = "#f97316";
        ctx.strokeStyle = "#fff6";
        ctx.beginPath();
        ctx.arc(toX(p.x), toY(p.y), 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    };

    const drawOverfit = (w, h, t) => {
      drawGrid(w, h);
      const n = 70;
      const train = [];
      const test = [];
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1);
        const trainY = 0.75 * Math.exp(-x * 2.2) + 0.08 + 0.02 * Math.sin(i * 0.2 + t / 900);
        const testY = trainY + 0.18 * Math.max(0, x - 0.45) + 0.02 * Math.cos(i * 0.15 + t / 1100);
        train.push({ x, y: trainY });
        test.push({ x, y: testY });
      }
      const toX = (x) => 24 + x * (w - 48);
      const toY = (y) => h - 24 - y * (h - 52);

      const drawLine = (arr, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        arr.forEach((p, idx) => {
          const px = toX(p.x);
          const py = toY(p.y);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      };

      drawLine(train, "#22c55e");
      drawLine(test, "#ef4444");
      ctx.fillStyle = "rgba(239,68,68,0.14)";
      const startX = toX(0.6);
      ctx.fillRect(startX, 16, w - startX - 12, h - 32);
    };

    const drawActivation = (w, h, t) => {
      drawGrid(w, h);
      const toX = (x) => ((x + 5) / 10) * w;
      const toY = (y) => h - ((y + 2) / 4) * h;

      const relu = (x) => Math.max(0, x);
      const sigmoid = (x) => 1 / (1 + Math.exp(-x));
      const tanh = (x) => Math.tanh(x);
      const leaky = (x) => (x > 0 ? x : 0.1 * x);

      const curves = [
        { fn: relu, color: "#60a5fa" },
        { fn: sigmoid, color: "#22c55e", scaleY: 2, offsetY: -1 },
        { fn: tanh, color: "#f59e0b" },
        { fn: leaky, color: "#a78bfa" }
      ];

      curves.forEach(({ fn, color, scaleY = 1, offsetY = 0 }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = -5; x <= 5; x += 0.05) {
          const y = fn(x) * scaleY + offsetY;
          const px = toX(x);
          const py = toY(y);
          if (x <= -4.95) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      });

      const z = -5 + ((Math.sin(t / 900) + 1) * 0.5) * 10;
      const y = relu(z);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(toX(z), toY(y), 5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawLoss = (w, h, t) => {
      drawGrid(w, h);
      const toX = (x) => 16 + x * (w - 32);
      const toY = (y) => h - 16 - y * (h - 32);
      const mse = [];
      const mae = [];
      const bce = [];
      const n = 80;
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1);
        mse.push({ x, y: Math.min(1, x * x * 1.1) });
        mae.push({ x, y: Math.min(1, x) });
        bce.push({ x, y: Math.min(1, -Math.log(Math.max(0.02, 1 - x)) / 4.2) });
      }
      const drawLine = (arr, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        arr.forEach((p, idx) => {
          const px = toX(p.x);
          const py = toY(p.y);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      };
      drawLine(mse, "#60a5fa");
      drawLine(mae, "#22c55e");
      drawLine(bce, "#f59e0b");

      const cursor = ((Math.sin(t / 1000) + 1) * 0.5);
      ctx.strokeStyle = "rgba(248,250,252,0.5)";
      ctx.beginPath();
      ctx.moveTo(toX(cursor), 8);
      ctx.lineTo(toX(cursor), h - 8);
      ctx.stroke();
    };

    const drawLayers = (w, h, t) => {
      drawGrid(w, h);
      const cols = [
        [{ x: 50, y: h * 0.28 }, { x: 50, y: h * 0.72 }],
        Array.from({ length: 3 }, (_, i) => ({ x: w * 0.38, y: h * (0.24 + i * 0.24) })),
        Array.from({ length: 3 }, (_, i) => ({ x: w * 0.64, y: h * (0.24 + i * 0.24) })),
        [{ x: w - 50, y: h * 0.5 }]
      ];

      ctx.lineWidth = 1.2;
      for (let c = 0; c < cols.length - 1; c++) {
        cols[c].forEach((a, i) => {
          cols[c + 1].forEach((b, j) => {
            ctx.strokeStyle = (i + j + c) % 2 ? "rgba(96,165,250,0.3)" : "rgba(251,191,36,0.22)";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          });
        });
      }

      const pulseX = (Math.sin(t / 600) + 1) * 0.5;
      const pulseLayer = Math.min(cols.length - 1, Math.floor(pulseX * cols.length));
      cols.flat().forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = "#a855f7";
        ctx.fill();
        ctx.strokeStyle = "#dbeafe88";
        ctx.stroke();
      });
      cols[pulseLayer].forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 11.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    const drawGradient = (w, h, t) => {
      drawGrid(w, h);
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rx = w * 0.36;
      const ry = h * 0.28;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * (1 - i * 0.1), ry * (1 - i * 0.1), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(96,165,250,${0.45 - i * 0.04})`;
        ctx.stroke();
      }
      const angle = t / 900;
      const px = cx + Math.cos(angle) * rx * 0.55 * (1 - (angle % (Math.PI * 2)) / (Math.PI * 2));
      const py = cy + Math.sin(angle * 1.2) * ry * 0.55 * (1 - (angle % (Math.PI * 2)) / (Math.PI * 2));
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawDecision = (w, h, t) => {
      drawGrid(w, h);
      const cx = w * 0.5;
      const cy = h * 0.53;
      const angle = Math.sin(t / 1200) * 0.7;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const grad = ctx.createLinearGradient(cx - nx * w * 0.55, cy - ny * h * 0.55, cx + nx * w * 0.55, cy + ny * h * 0.55);
      grad.addColorStop(0, "rgba(239,68,68,0.24)");
      grad.addColorStop(1, "rgba(37,99,235,0.24)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 34; i++) {
        const px = w * (0.08 + seededNoise(i, 9) * 0.84);
        const py = h * (0.12 + seededNoise(i, 11) * 0.76);
        const side = (px - cx) * nx + (py - cy) * ny > 0 ? 1 : 0;
        ctx.strokeStyle = side ? "#38bdf8" : "#f87171";
        ctx.fillStyle = side ? "rgba(56,189,248,0.26)" : "rgba(248,113,113,0.26)";
        ctx.beginPath();
        ctx.arc(px, py, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - ny * w, cy + nx * h);
      ctx.lineTo(cx + ny * w, cy - nx * h);
      ctx.stroke();
    };

    const drawNeuroevolution = (w, h, t) => {
      drawGrid(w, h);

      const centerX = w * 0.5;
      const centerY = h * 0.5;
      const pulse = 0.5 + 0.5 * Math.sin(t / 700);

      const rings = [
        { r: Math.min(w, h) * 0.18, count: 6, color: "#22d3ee" },
        { r: Math.min(w, h) * 0.31, count: 9, color: "#a78bfa" },
        { r: Math.min(w, h) * 0.43, count: 12, color: "#38bdf8" }
      ];

      const nodes = [];
      rings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i++) {
          const angle = (i / ring.count) * Math.PI * 2 + ringIndex * 0.22 + t / (2200 + ringIndex * 900);
          nodes.push({
            x: centerX + Math.cos(angle) * ring.r,
            y: centerY + Math.sin(angle) * ring.r,
            color: ring.color,
            ringIndex,
            index: i
          });
        }
      });

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (Math.abs(a.ringIndex - b.ringIndex) > 1) continue;
          const linkSeed = (a.index * 31 + b.index * 17 + a.ringIndex * 13 + b.ringIndex * 7) % 11;
          if (linkSeed > 2) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > Math.min(w, h) * 0.26) continue;

          const alpha = Math.max(0.12, 0.45 - dist / Math.max(w, h));
          const active = 0.45 + 0.55 * Math.sin(t / 600 + i * 0.15 + j * 0.11);

          ctx.strokeStyle = `rgba(147,197,253,${alpha * active})`;
          ctx.lineWidth = 1 + active * 1.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = "rgba(34,197,94,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < rings.length; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, rings[i].r + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      nodes.forEach((node, i) => {
        const localPulse = 0.55 + 0.45 * Math.sin(t / 520 + i * 0.3);
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10 * localPulse;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3 + localPulse * 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(226,232,240,0.82)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("NEUROEVOLUTION", centerX, centerY + rings[2].r + 22);
    };

    const drawLimit = (w, h, t) => {
      drawGrid(w, h);
      const toX = (x) => ((x + 4) / 8) * w;
      const toY = (y) => h - ((y + 1) / 6) * h;
      const f = (x) => 0.22 * x * x + 1.15;
      const a = 2;
      const L = f(a);
      const eps = 0.55 + Math.sin(t / 1200) * 0.18;
      const delta = Math.max(0.25, eps * 0.65);
      const left = a - (delta * (0.15 + ((Math.sin(t / 700) + 1) * 0.42)));
      const right = a + (delta * (0.15 + ((Math.cos(t / 760) + 1) * 0.42)));

      ctx.fillStyle = "rgba(96,165,250,0.14)";
      ctx.fillRect(toX(a - delta), 0, toX(a + delta) - toX(a - delta), h);
      ctx.fillStyle = "rgba(251,191,36,0.12)";
      ctx.fillRect(0, toY(L + eps), w, toY(L - eps) - toY(L + eps));

      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      for (let x = -4; x <= 4; x += 0.03) {
        const px = toX(x);
        const py = toY(f(x));
        if (x === -4) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const drawPoint = (x, color) => {
        ctx.beginPath();
        ctx.arc(toX(x), toY(f(x)), 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };
      drawPoint(left, "#f97316");
      drawPoint(right, "#10b981");
      drawPoint(a, "#f8fafc");
    };

    const drawDerivative = (w, h, t) => {
      drawGrid(w, h);
      const toX = (x) => ((x + 4) / 8) * w;
      const toY = (y) => h - ((y + 2.2) / 7.4) * h;
      const f = (x) => 0.11 * x * x * x - 0.36 * x + 1.5;
      const a = 0.4;
      const hStep = 1.1 - ((Math.sin(t / 850) + 1) * 0.48);
      const x2 = a + hStep;
      const y1 = f(a);
      const y2 = f(x2);
      const deriv = 0.33 * a * a - 0.36;

      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = -4; x <= 4; x += 0.02) {
        const px = toX(x);
        const py = toY(f(x));
        if (x === -4) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(toX(a), toY(y1));
      ctx.lineTo(toX(x2), toY(y2));
      ctx.stroke();

      ctx.strokeStyle = "#34d399";
      ctx.beginPath();
      ctx.moveTo(toX(-4), toY(y1 + deriv * (-4 - a)));
      ctx.lineTo(toX(4), toY(y1 + deriv * (4 - a)));
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(toX(a), toY(y1), 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(toX(x2), toY(y2), 4.8, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawTopology = (w, h, t) => {
      drawGrid(w, h);
      const mid = w * 0.48;
      const leftW = mid - 8;
      const rightX = mid + 12;
      const toLX = (x) => ((x + 2.2) / 4.4) * leftW;
      const toLY = (y) => h - ((y + 1.6) / 3.2) * h;

      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const u = (i / 240) * Math.PI * 2;
        const x = Math.sin(u);
        const y = Math.sin(u) * Math.cos(u);
        const px = toLX(x * 1.9);
        const py = toLY(y * 1.7);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(148,163,184,0.7)";
      ctx.beginPath();
      ctx.moveTo(mid, 0);
      ctx.lineTo(mid, h);
      ctx.stroke();

      const rx = (x) => rightX + ((x + 2) / 4) * (w - rightX - 8);
      const ry = (y) => h - ((y + 1.4) / 2.8) * h;
      ctx.strokeStyle = "rgba(96,165,250,0.62)";
      ctx.lineWidth = 1.2;
      for (let gx = -2; gx <= 2; gx += 0.5) {
        ctx.beginPath();
        for (let gy = -1.4; gy <= 1.4; gy += 0.08) {
          const z = 0.4 + 0.45 * Math.sin(gx * 1.3 + gy * 0.8 + t / 900);
          const px = rx(gx + z * 0.18);
          const py = ry(gy - z * 0.2);
          if (gy === -1.4) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.fillStyle = "#f59e0b";
      for (let i = 0; i < 7; i++) {
        const px = rx(-1.2 + i * 0.42 + 0.12 * Math.sin(t / 900 + i));
        const py = ry(-0.5 + 0.36 * Math.cos(t / 800 + i * 0.8));
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = (timestamp) => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      if (type === "wave") drawWave(w, h, timestamp);
      if (type === "network") drawNetwork(w, h, timestamp);
      if (type === "layers") drawLayers(w, h, timestamp);
      if (type === "activation") drawActivation(w, h, timestamp);
      if (type === "loss") drawLoss(w, h, timestamp);
      if (type === "gradient") drawGradient(w, h, timestamp);
      if (type === "regression") drawRegression(w, h, timestamp);
      if (type === "scatter") drawScatter(w, h);
      if (type === "overfit") drawOverfit(w, h, timestamp);
      if (type === "decision") drawDecision(w, h, timestamp);
      if (type === "neuroevolution") drawNeuroevolution(w, h, timestamp);
      if (type === "limit") drawLimit(w, h, timestamp);
      if (type === "derivative") drawDerivative(w, h, timestamp);
      if (type === "topology") drawTopology(w, h, timestamp);
      raf = window.requestAnimationFrame(render);
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    raf = window.requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
    };
  }, [type]);

  if (!CANVAS_VISUALS.has(type)) return null;
  return <canvas ref={canvasRef} className="lab-intro-canvas" />;
}

function PortraitImage({ src, fallbackSrc, alt }) {
  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setActiveSrc(src);
  }, [src]);

  return (
    <img
      src={activeSrc}
      alt={alt || "portrait"}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (fallbackSrc && activeSrc !== fallbackSrc) {
          setActiveSrc(fallbackSrc);
        }
      }}
    />
  );
}

function IntroVisual({ visual, isArabic, equationParts = [], partReveal = 0 }) {
  if (!visual || typeof visual !== "object") return null;
  const type = String(visual.type || "").toLowerCase();

  if (type === "portrait") {
    const secondarySrc = visual.secondarySrc;
    const secondaryAlt = resolveText(visual.secondaryAlt, isArabic);
    const secondaryCaption = resolveText(visual.secondaryCaption, isArabic);
    const primaryCaption = resolveText(visual.caption, isArabic);

    return (
      <div className="lab-intro-portrait">
        <div className={`lab-intro-portrait-pair ${secondarySrc ? "dual" : "single"}`}>
            <div className="lab-intro-portrait-card">
              <div className="lab-intro-portrait-ring">
                <PortraitImage
                  src={visual.src}
                  fallbackSrc={visual.fallbackSrc}
                  alt={resolveText(visual.alt, isArabic) || "portrait"}
                />
              </div>
              {primaryCaption ? <div className="lab-intro-portrait-caption">{primaryCaption}</div> : null}
            </div>
          {secondarySrc ? (
            <div className="lab-intro-portrait-card">
              <div className="lab-intro-portrait-ring">
                <PortraitImage src={secondarySrc} fallbackSrc={visual.src} alt={secondaryAlt || "portrait-secondary"} />
              </div>
              {secondaryCaption ? <div className="lab-intro-portrait-caption">{secondaryCaption}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (type === "heat") {
    return (
      <div className="lab-intro-heat">
        <div className="lab-intro-heat-rod" />
        <p>{resolveText(visual.caption, isArabic)}</p>
      </div>
    );
  }

  if (type === "equation-parts") {
    return (
      <div className="lab-intro-equation-visual">
        <div className="lab-intro-eq-parts">
          {equationParts.map((part, index) => (
            <div key={part.label || index} className={`lab-intro-eq-part ${index < partReveal ? "active" : ""}`}>
              <strong>{resolveText(part.label, isArabic)}</strong>
              <span>{resolveText(part.text, isArabic)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "icon-grid") {
    const items = Array.isArray(visual.items) ? visual.items : [];
    return (
      <div className="lab-intro-icon-grid">
        {items.map((item, index) => (
          <article key={index} className="lab-intro-icon-item" style={{ animationDelay: `${index * 100}ms` }}>
            <span className="lab-intro-icon">{resolveText(item.icon, isArabic)}</span>
            <div>
              <strong>{resolveText(item.title, isArabic)}</strong>
              <small>{resolveText(item.text, isArabic)}</small>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return <IntroCanvasVisual type={type} />;
}

export default function LabIntroModal({
  labId,
  slides = [],
  accentColor = "#06b6d4",
  isArabic = true,
  onClose
}) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animating, setAnimating] = useState(false);
  const [partReveal, setPartReveal] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const total = Math.max(1, slides.length);
  const particles = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  const labels = useMemo(
    () => ({
      skip: isArabic ? "تخطي" : "Skip",
      prev: isArabic ? "السابق" : "Previous",
      next: isArabic ? "التالي" : "Next",
      start: isArabic ? "ابدأ الاستكشاف" : "Start Exploring",
      step: isArabic ? "الخطوة" : "Step",
      dontShowAgain: isArabic ? "عدم العرض مجددًا" : "Don't show again"
    }),
    [isArabic]
  );

  const closeIntro = (persistChoice = dontShowAgain) => {
    try {
      const key = introStorageKey(labId);
      if (persistChoice) {
        window.localStorage.setItem(key, "true");
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore storage failures
    }
    onClose?.();
  };
  const goTo = (index, dir = "forward") => {
    if (animating) return;
    const clamped = Math.max(0, Math.min(total - 1, index));
    setDirection(dir);
    setAnimating(true);
    window.setTimeout(() => {
      setCurrent(clamped);
      setAnimating(false);
    }, 320);
  };

  const next = () => {
    if (current < total - 1) goTo(current + 1, "forward");
    else closeIntro(dontShowAgain);
  };

  const prev = () => {
    if (current > 0) goTo(current - 1, "backward");
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeIntro(dontShowAgain);
        return;
      }

      if (isArabic) {
        if (event.key === "ArrowLeft") next();
        if (event.key === "ArrowRight") prev();
      } else {
        if (event.key === "ArrowRight") next();
        if (event.key === "ArrowLeft") prev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isArabic, current, total]);

  const active = slides[current] || {};
  const title = resolveText(active.title, isArabic);
  const subtitle = resolveText(active.subtitle, isArabic);
  const note = resolveText(active.note, isArabic);
  const equation = resolveText(active.equation, isArabic);
  const bullets = Array.isArray(active.bullets)
    ? active.bullets.map((item) => resolveText(item, isArabic)).filter(Boolean)
    : [];
  const equationParts = Array.isArray(active.equationParts) ? active.equationParts : [];
  const visual = active.visual && typeof active.visual === "object" ? active.visual : null;
  const progressPercent = ((current + 1) / total) * 100;

  useEffect(() => {
    if (!equationParts.length) {
      setPartReveal(0);
      return undefined;
    }
    setPartReveal(0);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setPartReveal(step);
      if (step >= equationParts.length) window.clearInterval(timer);
    }, 360);
    return () => window.clearInterval(timer);
  }, [current, equationParts.length]);

  return (
    <div className="lab-intro-overlay" style={{ "--intro-accent": accentColor }} dir={isArabic ? "rtl" : "ltr"}>
      <div className="lab-intro-backdrop" />
      <div className="lab-intro-particles" aria-hidden="true">
        {particles.map((i) => (
          <span
            key={i}
            className="lab-intro-particle"
            style={{
              "--p-x": `${seededNoise(i, 1) * 100}%`,
              "--p-y": `${seededNoise(i, 2) * 100}%`,
              "--p-size": `${6 + seededNoise(i, 3) * 9}px`,
              "--p-delay": `${seededNoise(i, 4) * 2.6}s`,
              "--p-duration": `${4 + seededNoise(i, 5) * 5.4}s`
            }}
          />
        ))}
      </div>

      <button type="button" className="lab-intro-skip" onClick={() => closeIntro(dontShowAgain)}>
        {labels.skip}
      </button>

      <div className={`lab-intro-slide-wrap ${direction} ${animating ? "animating" : ""}`}>
        <article className="lab-intro-slide-card">
          <div className="lab-intro-step">
            {labels.step} {current + 1} / {total}
          </div>

          <div className="lab-intro-layout">
            <div className="lab-intro-visual-wrap">
              <IntroVisual visual={visual} isArabic={isArabic} equationParts={equationParts} partReveal={partReveal} />
            </div>
            <div className="lab-intro-text-wrap">
              <h2>{title}</h2>
              {subtitle ? <p className="lab-intro-subtitle">{subtitle}</p> : null}
              {equation ? <pre className="lab-intro-equation">{equation}</pre> : null}
              {bullets.length > 0 ? (
                <ul className="lab-intro-list">
                  {bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {note ? <blockquote>{note}</blockquote> : null}
            </div>
          </div>
        </article>
      </div>

      <div className="lab-intro-progress-track">
        <div className="lab-intro-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="lab-intro-dots">
        {slides.map((slide, index) => (
          <button
            key={slide.id || index}
            type="button"
            className={`lab-intro-dot ${index === current ? "active" : ""} ${index < current ? "done" : ""}`}
            onClick={() => goTo(index, index >= current ? "forward" : "backward")}
            aria-label={`${labels.step} ${index + 1}`}
          />
        ))}
      </div>

      <div className="lab-intro-nav">
        <label className="lab-intro-persist-option">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>{labels.dontShowAgain}</span>
        </label>
        <button type="button" className="lab-intro-nav-btn" onClick={prev} disabled={current === 0}>
          {labels.prev}
        </button>
        <button type="button" className="lab-intro-nav-btn primary" onClick={next}>
          {current === total - 1 ? labels.start : labels.next}
        </button>
      </div>
    </div>
  );
}




