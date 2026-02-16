class NeuralNetwork {
  constructor(architecture = [2, 4, 1], options = {}) {
    const {
      learningRate = 0.1,
      hiddenActivation = "relu",
      momentum = 0.85
    } = options;

    this.architecture = architecture;
    this.learningRate = learningRate;
    this.hiddenActivation = hiddenActivation;
    this.momentum = momentum;
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
      const scale = this.hiddenActivation === "relu"
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
    if (!activations.length || !zs.length) return;

    const L = this.weights.length;
    let delta = [];

    const output = activations[L];
    for (let i = 0; i < output.length; i += 1) {
      delta[i] = output[i] - (target[i] ?? 0);
    }

    for (let layer = L - 1; layer >= 0; layer -= 1) {
      const aPrev = activations[layer];
      const zPrev = zs[layer - 1];
      const W = this.weights[layer];

      const dW = W.map((row, i) => row.map((_, j) => delta[i] * aPrev[j]));
      const dB = delta.slice();

      this.gradientsW[layer] = dW.map((row) => row.slice());
      this.gradientsB[layer] = dB.slice();

      // Update weights and biases with momentum
      for (let i = 0; i < W.length; i += 1) {
        for (let j = 0; j < W[i].length; j += 1) {
          const velocity = this.momentum * this.velocitiesW[layer][i][j] + dW[i][j];
          this.velocitiesW[layer][i][j] = velocity;
          W[i][j] -= this.learningRate * velocity;
        }
        const biasVelocity = this.momentum * this.velocitiesB[layer][i] + dB[i];
        this.velocitiesB[layer][i] = biasVelocity;
        this.biases[layer][i] -= this.learningRate * biasVelocity;
      }

      if (layer > 0) {
        const newDelta = Array.from({ length: this.architecture[layer] }).map(() => 0);
        for (let j = 0; j < this.architecture[layer]; j += 1) {
          let sum = 0;
          for (let i = 0; i < delta.length; i += 1) {
            sum += W[i][j] * delta[i];
          }
          const deriv = this.activateDerivative(zPrev[j]);
          newDelta[j] = sum * deriv;
        }
        delta = newDelta;
      }
    }
  }

  loss(prediction, target) {
    const eps = 1e-8;
    const y = target ?? 0;
    const p = Math.min(1 - eps, Math.max(eps, prediction));
    return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }

  activate(value) {
    if (this.hiddenActivation === "tanh") return Math.tanh(value);
    return Math.max(0, value);
  }

  activateDerivative(value) {
    if (this.hiddenActivation === "tanh") {
      const t = Math.tanh(value);
      return 1 - t * t;
    }
    return value > 0 ? 1 : 0;
  }

  adjustLearningRate(factor = 0.9) {
    this.learningRate = Math.max(0.001, this.learningRate * factor);
    return this.learningRate;
  }

  resetMomentum() {
    this.velocitiesW = this.velocitiesW.map((layer) =>
      layer.map((row) => row.map(() => 0))
    );
    this.velocitiesB = this.velocitiesB.map((layer) => layer.map(() => 0));
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
