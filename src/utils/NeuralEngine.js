class NeuralNetwork {
  constructor(architecture = [2, 4, 1], options = {}) {
    const {
      learningRate = 0.1,
      hiddenActivation = "relu",
      momentum = 0.85,
      optimizer = "momentum"
    } = options;

    this.architecture = architecture;
    this.learningRate = learningRate;
    this.hiddenActivation = hiddenActivation;
    this.momentum = momentum;
    this.optimizer = optimizer === "sgd" ? "sgd" : "momentum";
    this.weights = [];
    this.biases = [];
    this.velocitiesW = [];
    this.velocitiesB = [];
    this.gradientsW = [];
    this.gradientsB = [];
    this.cache = { activations: [], zs: [] };

    this.initialize();
  }

  initialize() {
    this.weights = [];
    this.biases = [];
    this.velocitiesW = [];
    this.velocitiesB = [];
    this.gradientsW = [];
    this.gradientsB = [];

    for (let i = 0; i < this.architecture.length - 1; i += 1) {
      const fanIn = this.architecture[i];
      const fanOut = this.architecture[i + 1];
      const isReluFamily = this.hiddenActivation === "relu" || this.hiddenActivation === "leaky_relu";
      const scale = isReluFamily
        ? Math.sqrt(2 / fanIn)
        : Math.sqrt(1 / fanIn);

      const layerWeights = Array.from({ length: fanOut }).map(() =>
        Array.from({ length: fanIn }).map(() => randn() * scale)
      );
      const layerBiases = Array.from({ length: fanOut }).map(() => 0);
      const velocityW = Array.from({ length: fanOut }).map(() =>
        Array.from({ length: fanIn }).map(() => 0)
      );
      const velocityB = Array.from({ length: fanOut }).map(() => 0);

      this.weights.push(layerWeights);
      this.biases.push(layerBiases);
      this.velocitiesW.push(velocityW);
      this.velocitiesB.push(velocityB);
      this.gradientsW.push(
        Array.from({ length: fanOut }).map(() => Array.from({ length: fanIn }).map(() => 0))
      );
      this.gradientsB.push(Array.from({ length: fanOut }).map(() => 0));
    }
  }

  forward(inputs, cache = true) {
    let activation = inputs.slice();
    if (cache) {
      this.cache = { activations: [activation], zs: [] };
    }

    for (let layer = 0; layer < this.weights.length; layer += 1) {
      const W = this.weights[layer];
      const b = this.biases[layer];
      const z = W.map((row, j) => {
        let sum = b[j];
        for (let k = 0; k < row.length; k += 1) {
          sum += row[k] * activation[k];
        }
        return sum;
      });

      const isOutput = layer === this.weights.length - 1;
      activation = isOutput ? z.map(sigmoid) : z.map((val) => this.activate(val));

      if (cache) {
        this.cache.zs.push(z);
        this.cache.activations.push(activation);
      }
    }

    return activation;
  }

  predict(inputs) {
    return this.forward(inputs, false);
  }

  getNeuronActivationMap(gridX, gridY, layerIndex, neuronIndex) {
    if (!Array.isArray(gridX) || !Array.isArray(gridY)) return [];
    const inputCount = this.architecture[0] || 2;
    const map = [];

    for (let yi = 0; yi < gridY.length; yi += 1) {
      const y = gridY[yi];
      const row = [];
      for (let xi = 0; xi < gridX.length; xi += 1) {
        const x = gridX[xi];
        const inputs = Array.from({ length: inputCount }).map((_, idx) => {
          if (idx === 0) return x;
          if (idx === 1) return y;
          return 0;
        });

        let activation = inputs;
        if (layerIndex > 0) {
          for (let layer = 0; layer < layerIndex; layer += 1) {
            const W = this.weights[layer];
            const b = this.biases[layer];
            const z = W.map((rowWeights, j) => {
              let sum = b[j];
              for (let k = 0; k < rowWeights.length; k += 1) {
                sum += rowWeights[k] * activation[k];
              }
              return sum;
            });
            const isOutput = layer === this.weights.length - 1;
            activation = isOutput ? z.map(sigmoid) : z.map((val) => this.activate(val));
          }
        }

        let value = activation[neuronIndex] ?? 0;
        if (layerIndex < this.weights.length) {
          if (this.hiddenActivation === "tanh") {
            value = (value + 1) / 2;
          } else {
            value = Math.min(1, Math.max(0, value));
          }
        }
        row.push(value);
      }
      map.push(row);
    }
    return map;
  }

  backward(target) {
    const { activations, zs } = this.cache;
    if (!activations.length || !zs.length) {
      return { gradNorm: 0, updateNorm: 0 };
    }

    const L = this.weights.length;
    let delta = [];
    let gradSqSum = 0;
    let updateSqSum = 0;

    const output = activations[L];
    for (let i = 0; i < output.length; i += 1) {
      delta[i] = output[i] - (target[i] ?? 0);
    }

    for (let layer = L - 1; layer >= 0; layer -= 1) {
      const aPrev = activations[layer];
      const zPrev = zs[layer - 1];
      const W = this.weights[layer];
      const WSnapshot = W.map((row) => row.slice());

      const dW = W.map((row, i) => row.map((_, j) => delta[i] * aPrev[j]));
      const dB = delta.slice();

      this.gradientsW[layer] = dW.map((row) => row.slice());
      this.gradientsB[layer] = dB.slice();

      for (let i = 0; i < W.length; i += 1) {
        for (let j = 0; j < W[i].length; j += 1) {
          const grad = dW[i][j];
          gradSqSum += grad * grad;
          if (this.optimizer === "sgd") {
            const deltaW = this.learningRate * grad;
            W[i][j] -= deltaW;
            updateSqSum += deltaW * deltaW;
            this.velocitiesW[layer][i][j] = 0;
          } else {
            const velocity = this.momentum * this.velocitiesW[layer][i][j] + grad;
            this.velocitiesW[layer][i][j] = velocity;
            const deltaW = this.learningRate * velocity;
            W[i][j] -= deltaW;
            updateSqSum += deltaW * deltaW;
          }
        }
        const biasGrad = dB[i];
        gradSqSum += biasGrad * biasGrad;
        if (this.optimizer === "sgd") {
          const deltaB = this.learningRate * biasGrad;
          this.biases[layer][i] -= deltaB;
          updateSqSum += deltaB * deltaB;
          this.velocitiesB[layer][i] = 0;
        } else {
          const biasVelocity = this.momentum * this.velocitiesB[layer][i] + biasGrad;
          this.velocitiesB[layer][i] = biasVelocity;
          const deltaB = this.learningRate * biasVelocity;
          this.biases[layer][i] -= deltaB;
          updateSqSum += deltaB * deltaB;
        }
      }

      if (layer > 0) {
        const newDelta = Array.from({ length: this.architecture[layer] }).map(() => 0);
        for (let j = 0; j < this.architecture[layer]; j += 1) {
          let sum = 0;
          for (let i = 0; i < delta.length; i += 1) {
            sum += WSnapshot[i][j] * delta[i];
          }
          const deriv = this.activateDerivative(zPrev[j]);
          newDelta[j] = sum * deriv;
        }
        delta = newDelta;
      }
    }

    return {
      gradNorm: Math.sqrt(gradSqSum),
      updateNorm: Math.sqrt(updateSqSum)
    };
  }

  loss(prediction, target) {
    const eps = 1e-8;
    const y = target ?? 0;
    const p = Math.min(1 - eps, Math.max(eps, prediction));
    return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }

  activate(value) {
    if (this.hiddenActivation === "tanh") return Math.tanh(value);
    if (this.hiddenActivation === "leaky_relu") return value > 0 ? value : 0.05 * value;
    return Math.max(0, value);
  }

  activateDerivative(value) {
    if (this.hiddenActivation === "tanh") {
      const t = Math.tanh(value);
      return 1 - t * t;
    }
    if (this.hiddenActivation === "leaky_relu") return value > 0 ? 1 : 0.05;
    return value > 0 ? 1 : 0;
  }

  adjustLearningRate(factor = 0.9) {
    this.learningRate = Math.min(1, Math.max(0.001, this.learningRate * factor));
    return this.learningRate;
  }

  createSnapshot() {
    return {
      weights: this.weights.map((layer) => layer.map((row) => row.slice())),
      biases: this.biases.map((layer) => layer.slice())
    };
  }

  restoreSnapshot(snapshot) {
    if (!snapshot?.weights || !snapshot?.biases) return false;
    this.weights = snapshot.weights.map((layer) => layer.map((row) => row.slice()));
    this.biases = snapshot.biases.map((layer) => layer.slice());
    this.resetMomentum();
    return true;
  }

  resetMomentum() {
    this.velocitiesW = this.velocitiesW.map((layer) =>
      layer.map((row) => row.map(() => 0))
    );
    this.velocitiesB = this.velocitiesB.map((layer) => layer.map(() => 0));
  }

  setOptimizer(optimizer = "momentum") {
    this.optimizer = optimizer === "sgd" ? "sgd" : "momentum";
    if (this.optimizer === "sgd") {
      this.resetMomentum();
    }
    return this.optimizer;
  }
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export default NeuralNetwork;
