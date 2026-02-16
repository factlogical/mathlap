export const ACTIVATIONS = {
  relu: {
    name: "ReLU",
    formula: "max(0, z)",
    color: "#3b82f6",
    fn: (z) => Math.max(0, z),
    derivative: (z) => (z > 0 ? 1 : 0),
    description: "تعيد الصفر عندما تكون القيمة سالبة."
  },
  sigmoid: {
    name: "Sigmoid",
    formula: "1 / (1 + e^(-z))",
    color: "#10b981",
    fn: (z) => 1 / (1 + Math.exp(-z)),
    derivative: (z) => {
      const s = 1 / (1 + Math.exp(-z));
      return s * (1 - s);
    },
    description: "تضغط القيم إلى المدى بين 0 و 1."
  },
  tanh: {
    name: "Tanh",
    formula: "(e^z - e^(-z)) / (e^z + e^(-z))",
    color: "#f59e0b",
    fn: (z) => Math.tanh(z),
    derivative: (z) => 1 - Math.pow(Math.tanh(z), 2),
    description: "تضغط القيم إلى المدى بين -1 و 1."
  },
  leaky_relu: {
    name: "Leaky ReLU",
    formula: "z > 0 ? z : 0.01z",
    color: "#8b5cf6",
    fn: (z) => (z > 0 ? z : 0.01 * z),
    derivative: (z) => (z > 0 ? 1 : 0.01),
    description: "نسخة معدلة من ReLU تسمح بتدرج صغير في الجزء السالب."
  },
  elu: {
    name: "ELU",
    formula: "z > 0 ? z : a(e^z - 1)",
    color: "#ec4899",
    fn: (z, alpha = 1) => (z > 0 ? z : alpha * (Math.exp(z) - 1)),
    derivative: (z, alpha = 1) => (z > 0 ? 1 : alpha * Math.exp(z)),
    description: "دالة ناعمة في الجزء السالب وتفيد في بعض السيناريوهات."
  }
};

export const LOSSES = {
  mse: {
    name: "MSE",
    formula: "(1/n) Σ(y - ŷ)^2",
    color: "#3b82f6",
    fn: (y, yhat) => Math.pow(y - yhat, 2),
    description: "متوسط مربع الخطأ."
  },
  mae: {
    name: "MAE",
    formula: "(1/n) Σ|y - ŷ|",
    color: "#10b981",
    fn: (y, yhat) => Math.abs(y - yhat),
    description: "متوسط القيمة المطلقة للخطأ."
  },
  cross_entropy: {
    name: "Cross-Entropy",
    formula: "-[y log(ŷ) + (1-y) log(1-ŷ)]",
    color: "#f59e0b",
    fn: (y, yhat) => {
      const eps = 1e-15;
      const p = Math.max(eps, Math.min(1 - eps, yhat));
      return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    },
    description: "شائعة في مسائل التصنيف."
  },
  huber: {
    name: "Huber",
    formula: "z<=d ? 0.5z^2 : d(|z|-0.5d)",
    color: "#ec4899",
    fn: (y, yhat, delta = 1) => {
      const z = Math.abs(y - yhat);
      return z <= delta ? 0.5 * z * z : delta * (z - 0.5 * delta);
    },
    description: "حل وسط بين MSE و MAE."
  }
};

function getActivation(activationKey = "relu") {
  return ACTIVATIONS[activationKey] || ACTIVATIONS.relu;
}

export function computeUnits(x, units, activationKey = "relu") {
  const activation = getActivation(activationKey);
  return units.map((unit) => {
    const w = Number(unit?.w) || 0;
    const b = Number(unit?.b) || 0;
    const z = w * x + b;
    const a = activation.fn(z);
    return { z, a, active: z > 0 };
  });
}

export function computeOutput(x, units, activationKey = "relu") {
  const unitOutputs = computeUnits(x, units, activationKey);
  return unitOutputs.reduce((sum, u, i) => {
    const outW = Number(units?.[i]?.outW);
    return sum + (Number.isFinite(outW) ? outW : 1) * u.a;
  }, 0);
}

export function generateCurveData(fn, xMin, xMax, steps = 200) {
  const xs = [];
  const ys = [];
  const safeSteps = Math.max(10, Number(steps) || 200);
  const step = (xMax - xMin) / safeSteps;
  for (let i = 0; i <= safeSteps; i += 1) {
    const x = xMin + i * step;
    xs.push(x);
    ys.push(fn(x));
  }
  return { xs, ys };
}
