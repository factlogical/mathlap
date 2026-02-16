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
    name: "Circle",
    description: "Classical closed curve with many rectangles.",
    hasRectangles: true,
    generate: (resolution = 140) =>
      sampleClosedParametric((t) => ({
        x: Math.cos(t),
        y: Math.sin(t)
      }), resolution)
  },
  ellipse: {
    name: "Ellipse",
    description: "Stretched circle that still contains inscribed rectangles.",
    hasRectangles: true,
    generate: (resolution = 140) =>
      sampleClosedParametric((t) => ({
        x: 1.7 * Math.cos(t),
        y: 1.0 * Math.sin(t)
      }), resolution)
  },
  trefoil: {
    name: "Trefoil-like Curve",
    description: "A more complex closed curve for harder rectangle detection.",
    hasRectangles: true,
    generate: (resolution = 180) =>
      sampleClosedParametric((t) => ({
        x: Math.sin(t) + 1.6 * Math.sin(2 * t),
        y: Math.cos(t) - 1.6 * Math.cos(2 * t)
      }), resolution)
  },
  squircle: {
    name: "Squircle",
    description: "Blend between a square and a circle.",
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

