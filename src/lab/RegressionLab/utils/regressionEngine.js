function sign(value) {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

function normalizeX(value) {
  return Number(value) / 5;
}

function createPolynomialFeatures(x, degree) {
  const scaled = normalizeX(x);
  const out = [1];
  for (let d = 1; d <= degree; d += 1) {
    out.push(out[d - 1] * scaled);
  }
  return out;
}

function safeExp(value) {
  const clipped = Math.max(-5, Math.min(5, value));
  return Math.exp(clipped);
}

function applyFeatureBudget(features, featureDims) {
  const dims = Number.isFinite(featureDims) ? Math.max(3, Math.min(24, Math.round(featureDims))) : features.length;
  if (features.length <= dims) return features;
  return features.slice(0, dims);
}

function createLogisticFeatures(x, y, variant = "linear", degree = 2, featureDims = 10) {
  const sx = normalizeX(x);
  const sy = normalizeX(y);

  if (variant === "exponential") {
    const ex = safeExp(sx) - 1;
    const ey = safeExp(sy) - 1;
    const r2 = sx * sx + sy * sy;
    const expR = safeExp(r2 * 0.8) - 1;
    const candidates = [
      1,
      sx,
      sy,
      sx * sy,
      sx * sx,
      sy * sy,
      r2,
      ex,
      ey,
      safeExp(-sx) - 1,
      safeExp(-sy) - 1,
      sx * ey,
      sy * ex,
      expR,
      sx * expR,
      sy * expR
    ];
    return applyFeatureBudget(candidates, featureDims);
  }

  if (variant === "polynomial") {
    const d = Math.max(2, Math.min(8, Math.round(degree)));
    const r2 = sx * sx + sy * sy;
    const features = [1, sx, sy, r2, r2 * r2];
    for (let total = 2; total <= d; total += 1) {
      for (let px = total; px >= 0; px -= 1) {
        const py = total - px;
        features.push(Math.pow(sx, px) * Math.pow(sy, py));
      }
    }
    return applyFeatureBudget(features, featureDims);
  }

  return [1, sx, sy];
}

function sampleBatch(points, algorithm = "batch", batchSize = 32) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (algorithm !== "mini_batch") return points;
  const size = Math.max(8, Math.min(points.length, batchSize));
  const batch = [];
  for (let i = 0; i < size; i += 1) {
    batch.push(points[Math.floor(Math.random() * points.length)]);
  }
  return batch;
}

function linearLossDerivative(error, loss = "mse", delta = 1) {
  if (loss === "mae") return sign(error);
  if (loss === "huber") {
    if (Math.abs(error) <= delta) return error;
    return delta * sign(error);
  }
  return 2 * error;
}

function logisticLossDerivative(prediction, label, loss = "bce", logit = 0) {
  const p = Math.max(1e-7, Math.min(1 - 1e-7, prediction));
  const y = label ? 1 : 0;
  const base = p - y;

  if (loss === "mae") {
    return sign(base) * p * (1 - p);
  }

  if (loss === "mse") {
    return 2 * base * p * (1 - p);
  }

  if (loss === "log_cosh") {
    return Math.tanh(base) * p * (1 - p);
  }

  if (loss === "hinge") {
    const signedY = y === 1 ? 1 : -1;
    const margin = signedY * logit;
    return margin < 1 ? -signedY : 0;
  }

  if (loss === "focal") {
    const gamma = 2;
    const pt = y === 1 ? p : 1 - p;
    const focus = Math.pow(1 - pt, gamma);
    return focus * base;
  }

  return base;
}

function computeLinearLoss(points, model, loss = "mse") {
  if (!Array.isArray(points) || points.length === 0) return Infinity;
  const n = points.length;
  let total = 0;
  for (const point of points) {
    const error = model.predict(point.x) - point.y;
    if (loss === "mae") total += Math.abs(error);
    else if (loss === "huber") {
      const absError = Math.abs(error);
      total += absError <= 1 ? 0.5 * absError * absError : absError - 0.5;
    } else total += error * error;
  }
  return total / n;
}

function computeLogisticLoss(points, model, loss = "bce") {
  if (!Array.isArray(points) || points.length === 0) return Infinity;
  const n = points.length;
  let total = 0;
  for (const point of points) {
    const y = point.label ? 1 : 0;
    const p = Math.max(1e-7, Math.min(1 - 1e-7, model.predict(point.x, point.y)));
    if (loss === "mae") {
      total += Math.abs(p - y);
    } else if (loss === "mse") {
      total += (p - y) * (p - y);
    } else if (loss === "log_cosh") {
      total += Math.log(Math.cosh(p - y));
    } else if (loss === "hinge") {
      const signedY = y === 1 ? 1 : -1;
      const z = model.computeLogit(point.x, point.y);
      total += Math.max(0, 1 - signedY * z);
    } else if (loss === "focal") {
      const pt = y === 1 ? p : 1 - p;
      total += -Math.pow(1 - pt, 2) * Math.log(pt);
    } else {
      total += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    }
  }
  return total / n;
}

export class LinearRegression {
  constructor() {
    this.kind = "linear";
    this.w = 0;
    this.b = 0;
    this.vW = 0;
    this.vB = 0;
    this.lastGradient = 0;
    this.history = [];
    this.paramHistory = [];
  }

  step(points, options = {}) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const {
      lr = 0.01,
      algorithm = "batch",
      loss = "mse",
      batchSize = 32,
      momentum = 0.86
    } = options;

    const active = sampleBatch(points, algorithm, batchSize);
    const n = active.length;
    if (!n) return null;

    let dW = 0;
    let dB = 0;
    for (const point of active) {
      const error = this.predict(point.x) - point.y;
      const dPred = linearLossDerivative(error, loss);
      dW += dPred * point.x;
      dB += dPred;
    }
    dW /= n;
    dB /= n;
    this.lastGradient = dW;

    if (algorithm === "momentum") {
      this.vW = momentum * this.vW + dW;
      this.vB = momentum * this.vB + dB;
      this.w -= lr * this.vW;
      this.b -= lr * this.vB;
    } else {
      this.w -= lr * dW;
      this.b -= lr * dB;
      this.vW = 0;
      this.vB = 0;
    }

    const lossValue = computeLinearLoss(points, this, loss);
    this.history.push(lossValue);
    this.paramHistory.push({ w: this.w, b: this.b });
    return lossValue;
  }

  predict(x) {
    return this.w * x + this.b;
  }

  computeLoss(points, loss = "mse") {
    return computeLinearLoss(points, this, loss);
  }

  reset() {
    this.w = 0;
    this.b = 0;
    this.vW = 0;
    this.vB = 0;
    this.lastGradient = 0;
    this.history = [];
    this.paramHistory = [];
  }
}

export class PolynomialRegression {
  constructor(degree = 3) {
    this.kind = "polynomial";
    this.degree = Math.max(1, Math.min(10, Math.round(degree)));
    this.weights = Array(this.degree + 1).fill(0);
    this.velocities = Array(this.degree + 1).fill(0);
    this.history = [];
    this.paramHistory = [];
    this.w = 0;
    this.b = 0;
  }

  setDegree(nextDegree) {
    const degree = Math.max(1, Math.min(10, Math.round(nextDegree)));
    if (degree === this.degree) return;
    const nextWeights = Array(degree + 1).fill(0);
    const nextVelocities = Array(degree + 1).fill(0);
    for (let i = 0; i < nextWeights.length; i += 1) {
      if (i < this.weights.length) nextWeights[i] = this.weights[i];
      if (i < this.velocities.length) nextVelocities[i] = this.velocities[i];
    }
    this.degree = degree;
    this.weights = nextWeights;
    this.velocities = nextVelocities;
    this.b = this.weights[0] || 0;
    this.w = (this.weights[1] || 0) / 5;
  }

  predict(x) {
    const features = createPolynomialFeatures(x, this.degree);
    let out = 0;
    for (let i = 0; i < this.weights.length; i += 1) {
      out += this.weights[i] * features[i];
    }
    return out;
  }

  step(points, options = {}) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const {
      lr = 0.008,
      algorithm = "batch",
      loss = "mse",
      batchSize = 32,
      momentum = 0.88
    } = options;

    const active = sampleBatch(points, algorithm, batchSize);
    const n = active.length;
    if (!n) return null;

    const grads = Array(this.weights.length).fill(0);

    for (const point of active) {
      const features = createPolynomialFeatures(point.x, this.degree);
      const prediction = this.predict(point.x);
      const error = prediction - point.y;
      const dPred = linearLossDerivative(error, loss);
      for (let i = 0; i < grads.length; i += 1) {
        grads[i] += dPred * features[i];
      }
    }

    for (let i = 0; i < grads.length; i += 1) {
      grads[i] /= n;
      if (algorithm === "momentum") {
        this.velocities[i] = momentum * this.velocities[i] + grads[i];
        this.weights[i] -= lr * this.velocities[i];
      } else {
        this.weights[i] -= lr * grads[i];
        this.velocities[i] = 0;
      }
    }

    this.b = this.weights[0] || 0;
    this.w = (this.weights[1] || 0) / 5;

    const lossValue = computeLinearLoss(points, this, loss);
    this.history.push(lossValue);
    this.paramHistory.push({
      weights: [...this.weights],
      w: this.w,
      b: this.b
    });
    return lossValue;
  }

  computeLoss(points, loss = "mse") {
    return computeLinearLoss(points, this, loss);
  }

  reset() {
    this.weights = Array(this.degree + 1).fill(0);
    this.velocities = Array(this.degree + 1).fill(0);
    this.b = 0;
    this.w = 0;
    this.history = [];
    this.paramHistory = [];
  }
}

export class LogisticRegression {
  constructor(options = {}) {
    this.kind = "logistic";
    this.variant = ["linear", "polynomial", "exponential"].includes(options.variant)
      ? options.variant
      : "linear";
    this.degree = Math.max(2, Math.min(8, Math.round(options.degree || 3)));
    this.featureDims = Math.max(3, Math.min(24, Math.round(options.featureDims || 10)));
    const featureCount = createLogisticFeatures(0, 0, this.variant, this.degree, this.featureDims).length;
    this.weights = Array(featureCount).fill(0);
    this.velocities = Array(featureCount).fill(0);
    this.w1 = 0;
    this.w2 = 0;
    this.b = 0;
    this.history = [];
    this.paramHistory = [];
  }

  sigmoid(z) {
    const clipped = Math.max(-40, Math.min(40, z));
    return 1 / (1 + Math.exp(-clipped));
  }

  features(x, y) {
    return createLogisticFeatures(x, y, this.variant, this.degree, this.featureDims);
  }

  syncLegacyParams() {
    this.b = Number(this.weights[0]) || 0;
    this.w1 = Number(this.weights[1]) || 0;
    this.w2 = Number(this.weights[2]) || 0;
  }

  computeLogit(x, y) {
    const feats = this.features(x, y);
    let z = 0;
    for (let i = 0; i < this.weights.length; i += 1) {
      z += this.weights[i] * feats[i];
    }
    return z;
  }

  step(points, options = {}) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const {
      lr = 0.08,
      algorithm = "batch",
      loss = "bce",
      batchSize = 36,
      momentum = 0.88
    } = options;

    const active = sampleBatch(points, algorithm, batchSize);
    const n = active.length;
    if (!n) return null;

    const gradients = Array(this.weights.length).fill(0);
    const prevWeights = [...this.weights];
    const prevVelocities = [...this.velocities];
    const prevLoss = this.history.length ? this.history[this.history.length - 1] : null;
    const positiveCount = active.reduce((sum, point) => sum + (point.label === 1 ? 1 : 0), 0);
    const negativeCount = n - positiveCount;
    const positiveWeight = positiveCount > 0 ? n / (2 * positiveCount) : 1;
    const negativeWeight = negativeCount > 0 ? n / (2 * negativeCount) : 1;

    for (const point of active) {
      const y = point.label ? 1 : 0;
      const feats = this.features(point.x, point.y);
      let z = 0;
      for (let i = 0; i < this.weights.length; i += 1) {
        z += this.weights[i] * feats[i];
      }
      const p = this.sigmoid(z);
      const classWeight = y === 1 ? positiveWeight : negativeWeight;
      const dZ = logisticLossDerivative(p, y, loss, z) * classWeight;
      for (let i = 0; i < gradients.length; i += 1) {
        gradients[i] += dZ * feats[i];
      }
    }

    for (let i = 0; i < gradients.length; i += 1) {
      gradients[i] /= n;
    }

    // Stabilize nonlinear logistic training when steps/frame is high.
    const gradNorm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));
    const clipNorm = 4;
    const scale = gradNorm > clipNorm ? clipNorm / Math.max(1e-8, gradNorm) : 1;

    for (let i = 0; i < gradients.length; i += 1) {
      gradients[i] *= scale;
      if (this.variant !== "linear" && i > 0) {
        // Light L2 regularization for nonlinear maps to avoid unstable growth.
        gradients[i] += 0.0015 * this.weights[i];
      }
      if (algorithm === "momentum") {
        this.velocities[i] = momentum * this.velocities[i] + gradients[i];
        this.weights[i] -= lr * this.velocities[i];
      } else {
        this.weights[i] -= lr * gradients[i];
        this.velocities[i] = 0;
      }
    }
    this.syncLegacyParams();

    let lossValue = computeLogisticLoss(points, this, loss);

    const unstableJump =
      Number.isFinite(prevLoss) &&
      Number.isFinite(lossValue) &&
      prevLoss > 1e-6 &&
      lossValue > prevLoss * 1.9 &&
      lossValue > 0.95;
    if (!Number.isFinite(lossValue) || unstableJump) {
      // Guard against occasional exploding updates without changing user LR.
      this.weights = prevWeights;
      this.velocities = prevVelocities.map((value) => value * 0.5);
      this.syncLegacyParams();
      lossValue = Number.isFinite(prevLoss) ? prevLoss : computeLogisticLoss(points, this, loss);
    }

    this.history.push(lossValue);
    this.paramHistory.push({
      w1: this.w1,
      w2: this.w2,
      b: this.b,
      weights: [...this.weights]
    });
    return lossValue;
  }

  predict(x, y) {
    return this.sigmoid(this.computeLogit(x, y));
  }

  decisionBoundaryY(x) {
    if (this.variant !== "linear") return null;
    if (Math.abs(this.w2) < 1e-8) return 0;
    return ((-(this.w1 * normalizeX(x) + this.b)) * 5) / this.w2;
  }

  computeLoss(points, loss = "bce") {
    return computeLogisticLoss(points, this, loss);
  }

  reset() {
    this.weights = Array(this.weights.length).fill(0);
    this.velocities = Array(this.velocities.length).fill(0);
    this.syncLegacyParams();
    this.history = [];
    this.paramHistory = [];
  }
}

export function knnPredict(points, queryX, queryY, k = 3) {
  if (!Array.isArray(points) || points.length < k) return null;
  const nearest = [...points]
    .filter((point) => typeof point.label === "number")
    .map((point) => ({
      ...point,
      distance: Math.hypot(point.x - queryX, point.y - queryY)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  if (!nearest.length) return null;
  const votes = nearest.reduce((sum, point) => sum + (point.label ? 1 : 0), 0);
  return votes >= Math.ceil(k / 2) ? 1 : 0;
}

export function makeModel(kind = "linear", options = {}) {
  const safeKind = String(kind || "linear").toLowerCase();
  if (safeKind === "logistic") return new LogisticRegression(options);
  if (safeKind === "polynomial") return new PolynomialRegression(options.degree);
  return new LinearRegression();
}
