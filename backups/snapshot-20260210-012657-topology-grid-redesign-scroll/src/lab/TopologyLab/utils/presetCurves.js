function sampleClosedParametric(fn, resolution = 140) {
  const count = Math.max(24, Math.floor(resolution));
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i / count) * Math.PI * 2;
    points.push(fn(t));
  }
  return points;
}

export const PRESET_CURVES = {
  circle: {
    name: "دائرة",
    description: "منحنى أساسي منتظم وسهل القراءة.",
    hasRectangles: true,
    generate: (resolution = 140) =>
      sampleClosedParametric((t) => ({
        x: Math.cos(t),
        y: Math.sin(t)
      }), resolution)
  },
  figure8: {
    name: "رقم 8",
    description: "منحنى متقاطع بسيط يوضح الفكرة بسرعة.",
    hasRectangles: true,
    generate: (resolution = 160) =>
      sampleClosedParametric((t) => ({
        x: 1.35 * Math.sin(t),
        y: 0.82 * Math.sin(2 * t)
      }), resolution)
  },
  lemniscate: {
    name: "Lemniscate",
    description: "شكل اللانهاية بخصائص طوبولوجية مثيرة.",
    hasRectangles: true,
    generate: (resolution = 170) =>
      sampleClosedParametric((t) => {
        const s = Math.sin(t);
        const c = Math.cos(t);
        const den = 1 + s * s;
        return {
          x: (1.85 * c) / den,
          y: (1.85 * s * c) / den
        };
      }, resolution)
  },
  ellipse: {
    name: "قطع ناقص",
    description: "نسخة ممدودة من الدائرة مع مستطيلات متنوعة.",
    hasRectangles: true,
    generate: (resolution = 140) =>
      sampleClosedParametric((t) => ({
        x: 1.7 * Math.cos(t),
        y: 1.0 * Math.sin(t)
      }), resolution)
  },
  trefoil: {
    name: "عقدة ثلاثية",
    description: "منحنى أعقد لاختبار كشف التصادمات الذاتية.",
    hasRectangles: true,
    generate: (resolution = 180) =>
      sampleClosedParametric((t) => ({
        x: Math.sin(t) + 1.6 * Math.sin(2 * t),
        y: Math.cos(t) - 1.6 * Math.cos(2 * t)
      }), resolution)
  },
  spiral: {
    name: "Spiral",
    description: "منحنى حلزوني مغلق (وردة حلزونية).",
    hasRectangles: true,
    generate: (resolution = 180) =>
      sampleClosedParametric((t) => {
        const r = 1 + 0.42 * Math.cos(5 * t);
        return {
          x: r * Math.cos(t),
          y: r * Math.sin(t)
        };
      }, resolution)
  },
  squircle: {
    name: "مربع-دائري",
    description: "مزيج بين الدائرة والمربع.",
    hasRectangles: true,
    generate: (resolution = 140) =>
      sampleClosedParametric((t) => {
        const c = Math.cos(t);
        const s = Math.sin(t);
        const n = 4;
        const denom = Math.pow(Math.abs(c), n) + Math.pow(Math.abs(s), n);
        const r = denom > 1e-9 ? Math.pow(denom, -1 / n) : 1;
        return {
          x: r * c,
          y: r * s
        };
      }, resolution)
  }
};

export const PRESET_CURVE_IDS = Object.keys(PRESET_CURVES);
