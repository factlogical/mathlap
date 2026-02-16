function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomWeight() {
  return Math.random() * 4 - 2;
}

function randomBias() {
  return Math.random() * 0.2 - 0.1;
}

function shallowNodeCopy(node) {
  return {
    id: node.id,
    type: node.type,
    bias: Number(node.bias || 0)
  };
}

function shallowConnCopy(conn) {
  return {
    fromNode: conn.fromNode,
    toNode: conn.toNode,
    weight: Number(conn.weight || 0),
    enabled: conn.enabled !== false,
    innovation: conn.innovation
  };
}

function typeRank(type) {
  if (type === "input") return 0;
  if (type === "hidden") return 1;
  if (type === "output") return 2;
  return 3;
}

function applyActivation(value, activation) {
  if (activation === "sigmoid") return 1 / (1 + Math.exp(-value));
  if (activation === "relu") return Math.max(0, value);
  if (activation === "sin") return Math.sin(value);
  return Math.tanh(value);
}

export class Genome {
  constructor(id, inputCount, outputCount, options = {}) {
    this.id = id;
    this.nodes = [];
    this.connections = [];
    this.fitness = 0;
    this.adjustedFitness = 0;
    this.speciesId = null;
    this.lastActivations = {};
    this.activation = options.activation || "tanh";

    for (let i = 0; i < inputCount; i += 1) {
      this.nodes.push({ id: i, type: "input", bias: 0 });
    }

    for (let i = 0; i < outputCount; i += 1) {
      this.nodes.push({ id: inputCount + i, type: "output", bias: 0 });
    }
  }

  setActivation(name) {
    this.activation = name || "tanh";
  }

  activate(inputs) {
    return this.activateDetailed(inputs).outputs;
  }

  activateDetailed(inputs) {
    const values = {};
    const ordered = this.topologicalSort();
    const inputNodes = this.nodes.filter((node) => node.type === "input");

    inputNodes.forEach((node, index) => {
      values[node.id] = Number(inputs?.[index] ?? 0);
    });

    ordered.forEach((node) => {
      if (node.type === "input") return;

      let sum = Number(node.bias || 0);
      for (let i = 0; i < this.connections.length; i += 1) {
        const conn = this.connections[i];
        if (!conn.enabled || conn.toNode !== node.id) continue;
        const source = Number(values[conn.fromNode] ?? 0);
        sum += source * Number(conn.weight || 0);
      }
      values[node.id] = applyActivation(sum, this.activation);
    });

    const outputs = this.nodes
      .filter((node) => node.type === "output")
      .sort((a, b) => a.id - b.id)
      .map((node) => Number(values[node.id] ?? 0));

    this.lastActivations = values;
    return { outputs, activations: values };
  }

  topologicalSort() {
    const nodeById = new Map(this.nodes.map((node) => [node.id, node]));
    const indegree = new Map();
    const adjacency = new Map();

    this.nodes.forEach((node) => {
      indegree.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    this.connections.forEach((conn) => {
      if (!conn.enabled) return;
      if (!nodeById.has(conn.fromNode) || !nodeById.has(conn.toNode)) return;
      adjacency.get(conn.fromNode).push(conn.toNode);
      indegree.set(conn.toNode, (indegree.get(conn.toNode) || 0) + 1);
    });

    const queue = [];
    indegree.forEach((deg, nodeId) => {
      if (deg === 0) queue.push(nodeId);
    });
    queue.sort((a, b) => {
      const nodeA = nodeById.get(a);
      const nodeB = nodeById.get(b);
      const rankDiff = typeRank(nodeA?.type) - typeRank(nodeB?.type);
      if (rankDiff !== 0) return rankDiff;
      return a - b;
    });

    const ordered = [];
    while (queue.length) {
      const currentId = queue.shift();
      ordered.push(nodeById.get(currentId));

      const nextNodes = adjacency.get(currentId) || [];
      for (let i = 0; i < nextNodes.length; i += 1) {
        const nextId = nextNodes[i];
        indegree.set(nextId, (indegree.get(nextId) || 0) - 1);
        if ((indegree.get(nextId) || 0) === 0) {
          queue.push(nextId);
        }
      }

      queue.sort((a, b) => {
        const nodeA = nodeById.get(a);
        const nodeB = nodeById.get(b);
        const rankDiff = typeRank(nodeA?.type) - typeRank(nodeB?.type);
        if (rankDiff !== 0) return rankDiff;
        return a - b;
      });
    }

    if (ordered.length !== this.nodes.length) {
      return [...this.nodes].sort((a, b) => {
        const rankDiff = typeRank(a.type) - typeRank(b.type);
        if (rankDiff !== 0) return rankDiff;
        return a.id - b.id;
      });
    }

    return ordered;
  }

  hasConnection(fromNode, toNode) {
    for (let i = 0; i < this.connections.length; i += 1) {
      const conn = this.connections[i];
      if (conn.fromNode === fromNode && conn.toNode === toNode) return true;
    }
    return false;
  }

  introducesCycle(fromNode, toNode) {
    if (fromNode === toNode) return true;
    const adjacency = new Map();
    this.nodes.forEach((node) => adjacency.set(node.id, []));
    this.connections.forEach((conn) => {
      if (!conn.enabled) return;
      adjacency.get(conn.fromNode)?.push(conn.toNode);
    });
    adjacency.get(fromNode)?.push(toNode);

    const stack = [toNode];
    const visited = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (current === fromNode) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const next = adjacency.get(current) || [];
      for (let i = 0; i < next.length; i += 1) {
        stack.push(next[i]);
      }
    }
    return false;
  }

  mutateWeights() {
    this.connections.forEach((conn) => {
      if (Math.random() < 0.8) {
        conn.weight += (Math.random() * 2 - 1) * 0.3;
      } else {
        conn.weight = randomWeight();
      }
      conn.weight = clamp(conn.weight, -4, 4);
    });
  }

  mutateAddConnection(tracker, maxAttempts = 30, options = {}) {
    const allowRecurrent = Boolean(options.allowRecurrent);
    const fromCandidates = this.nodes.filter((node) => node.type !== "output");
    const toCandidates = this.nodes.filter((node) => node.type !== "input");
    if (!fromCandidates.length || !toCandidates.length) return false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const from = fromCandidates[Math.floor(Math.random() * fromCandidates.length)];
      const to = toCandidates[Math.floor(Math.random() * toCandidates.length)];
      if (!from || !to) continue;
      if (from.id === to.id) continue;
      if (this.hasConnection(from.id, to.id)) continue;
      if (!allowRecurrent && this.introducesCycle(from.id, to.id)) continue;

      this.connections.push({
        fromNode: from.id,
        toNode: to.id,
        weight: randomWeight(),
        enabled: true,
        innovation: tracker.getInnovation(from.id, to.id)
      });
      return true;
    }

    return false;
  }

  mutateAddNode(tracker) {
    const enabledConnections = this.connections.filter((conn) => conn.enabled);
    if (!enabledConnections.length) return false;

    const chosen = enabledConnections[Math.floor(Math.random() * enabledConnections.length)];
    if (!chosen) return false;
    chosen.enabled = false;

    const newNodeId = tracker.getNewNodeId();
    this.nodes.push({
      id: newNodeId,
      type: "hidden",
      bias: randomBias()
    });

    this.connections.push({
      fromNode: chosen.fromNode,
      toNode: newNodeId,
      weight: 1,
      enabled: true,
      innovation: tracker.getInnovation(chosen.fromNode, newNodeId)
    });

    this.connections.push({
      fromNode: newNodeId,
      toNode: chosen.toNode,
      weight: Number(chosen.weight || 0),
      enabled: true,
      innovation: tracker.getInnovation(newNodeId, chosen.toNode)
    });

    return true;
  }

  compatibility(other) {
    const a = [...this.connections].sort((x, y) => x.innovation - y.innovation);
    const b = [...other.connections].sort((x, y) => x.innovation - y.innovation);

    let i = 0;
    let j = 0;
    let excess = 0;
    let disjoint = 0;
    let matching = 0;
    let weightDiff = 0;

    while (i < a.length && j < b.length) {
      const geneA = a[i];
      const geneB = b[j];
      if (geneA.innovation === geneB.innovation) {
        matching += 1;
        weightDiff += Math.abs(Number(geneA.weight || 0) - Number(geneB.weight || 0));
        i += 1;
        j += 1;
      } else if (geneA.innovation < geneB.innovation) {
        disjoint += 1;
        i += 1;
      } else {
        disjoint += 1;
        j += 1;
      }
    }

    excess += a.length - i;
    excess += b.length - j;

    const largestGenome = Math.max(a.length, b.length);
    const n = largestGenome < 20 ? 1 : largestGenome;
    const avgWeightDiff = matching > 0 ? weightDiff / matching : 0;

    return (1.0 * excess + 1.0 * disjoint) / Math.max(n, 1) + 0.4 * avgWeightDiff;
  }

  clone() {
    const copy = new Genome(this.id, 0, 0, { activation: this.activation });
    copy.nodes = this.nodes.map(shallowNodeCopy);
    copy.connections = this.connections.map(shallowConnCopy);
    copy.fitness = this.fitness;
    copy.adjustedFitness = this.adjustedFitness;
    copy.speciesId = this.speciesId;
    copy.lastActivations = { ...this.lastActivations };
    return copy;
  }

  static crossover(parent1, parent2) {
    const child = new Genome(parent1.id, 0, 0, {
      activation: parent1.activation || parent2.activation || "tanh"
    });
    const map1 = new Map(parent1.connections.map((conn) => [conn.innovation, conn]));
    const map2 = new Map(parent2.connections.map((conn) => [conn.innovation, conn]));
    const innovations = [...map1.keys()].sort((a, b) => a - b);

    const chosenConnections = [];
    innovations.forEach((innovation) => {
      const geneA = map1.get(innovation);
      const geneB = map2.get(innovation);
      if (geneA && geneB) {
        chosenConnections.push(shallowConnCopy(Math.random() < 0.5 ? geneA : geneB));
      } else if (geneA) {
        chosenConnections.push(shallowConnCopy(geneA));
      }
    });

    const nodeIds = new Set();
    chosenConnections.forEach((conn) => {
      nodeIds.add(conn.fromNode);
      nodeIds.add(conn.toNode);
    });

    parent1.nodes.forEach((node) => {
      if (node.type === "input" || node.type === "output") nodeIds.add(node.id);
    });

    const nodeMap = new Map();
    parent1.nodes.forEach((node) => nodeMap.set(node.id, shallowNodeCopy(node)));
    parent2.nodes.forEach((node) => {
      if (!nodeMap.has(node.id)) nodeMap.set(node.id, shallowNodeCopy(node));
    });

    child.nodes = [...nodeIds]
      .filter((id) => nodeMap.has(id))
      .map((id) => nodeMap.get(id))
      .sort((a, b) => a.id - b.id);
    child.connections = chosenConnections.sort((a, b) => a.innovation - b.innovation);
    child.fitness = 0;
    child.adjustedFitness = 0;
    child.speciesId = null;
    child.lastActivations = {};

    return child;
  }
}
