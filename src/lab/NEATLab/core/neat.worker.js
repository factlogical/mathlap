import { NEATEngine } from "./NEATEngine.js";
import { FlappyBirdEnv } from "../environments/FlappyBird.js";

const DEFAULT_OPTIONS = {
  populationSize: 150,
  compatibilityThreshold: 3.0,
  weightMutationRate: 0.8,
  addConnectionRate: 0.05,
  addNodeRate: 0.03,
  crossoverRate: 0.75,
  interSpeciesMateRate: 0.001,
  survivalRate: 0.25,
  allowRecurrent: false,
  activation: "tanh",
  maxStaleGenerations: 15,
  maxStepsPerEval: 1000
};

let engine = null;
let isRunning = false;
let runLoopPromise = null;
let currentConfig = { ...DEFAULT_OPTIONS };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toUpperType(type) {
  return String(type || "").trim().toUpperCase();
}

function serializeGenomeFull(genome, includeActivations = false) {
  return {
    id: genome.id,
    fitness: Number(genome.fitness || 0),
    adjustedFitness: Number(genome.adjustedFitness || 0),
    speciesId: genome.speciesId,
    activation: genome.activation || "tanh",
    nodes: genome.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      bias: Number(node.bias || 0)
    })),
    connections: genome.connections.map((conn) => ({
      fromNode: conn.fromNode,
      toNode: conn.toNode,
      weight: Number(conn.weight || 0),
      enabled: conn.enabled !== false,
      innovation: conn.innovation
    })),
    lastActivations: includeActivations ? { ...(genome.lastActivations || {}) } : {}
  };
}

function serializeGenomeLite(genome) {
  return {
    id: genome.id,
    fitness: Number(genome.fitness || 0),
    adjustedFitness: Number(genome.adjustedFitness || 0),
    speciesId: genome.speciesId,
    nodesCount: genome.nodes.length,
    connsCount: genome.connections.filter((conn) => conn.enabled !== false).length
  };
}

function createEngine(configOverrides = {}) {
  currentConfig = {
    ...currentConfig,
    ...configOverrides
  };

  const environment = new FlappyBirdEnv({
    maxSteps: currentConfig.maxStepsPerEval,
    width: 800,
    height: 500
  });

  engine = new NEATEngine(environment, currentConfig);
}

function buildSnapshot() {
  if (!engine) return null;

  const visiblePopulation = engine.getDisplayPopulation?.() || engine.population;
  const best = engine.getDisplayBest?.() || engine.getBest();

  const visualGenomeBudget = 48;
  const topVisualGenomes = visiblePopulation
    .slice(0, visualGenomeBudget)
    .map((genome) => serializeGenomeFull(genome, false));

  return {
    generation: engine.generation,
    history: [...engine.history],
    population: visiblePopulation.map(serializeGenomeLite),
    populationGenomes: topVisualGenomes,
    species: engine.species.map((species) => ({
      id: species.id,
      members: species.members.map((member) => member.id),
      representativeId: species.representative?.id ?? null,
      bestFitness: Number(species.bestFitness || 0),
      staleGenerations: species.staleGenerations
    })),
    stats: engine.getStats(),
    best: best ? serializeGenomeFull(best, true) : null,
    config: engine.getConfig?.() || { ...currentConfig },
    running: isRunning
  };
}

async function evolveOneGeneration() {
  if (!engine) return;

  await engine.evolveOneGeneration((progress) => {
    self.postMessage({
      type: "PROGRESS",
      progress,
      generation: engine.generation
    });
  });

  self.postMessage({
    type: "GENERATION_COMPLETE",
    snapshot: buildSnapshot()
  });
}

async function ensureRunLoop() {
  if (runLoopPromise) return runLoopPromise;

  runLoopPromise = (async () => {
    while (isRunning) {
      await evolveOneGeneration();
      if (!isRunning) break;
      await sleep(20);
    }
  })()
    .catch((error) => {
      self.postMessage({
        type: "ERROR",
        message: error?.message || "Unknown worker loop error."
      });
    })
    .finally(() => {
      runLoopPromise = null;
    });

  return runLoopPromise;
}

self.onmessage = async (event) => {
  const { type, payload } = event.data || {};
  const messageType = toUpperType(type);

  try {
    if (messageType === "INIT") {
      isRunning = false;
      createEngine(payload || {});
      self.postMessage({ type: "INITED", snapshot: buildSnapshot() });
      return;
    }

    if (!engine) {
      self.postMessage({
        type: "ERROR",
        message: "NEAT worker is not initialized."
      });
      return;
    }

    if (messageType === "RESET") {
      isRunning = false;
      await runLoopPromise;
      createEngine(payload || {});
      self.postMessage({ type: "RESET", snapshot: buildSnapshot() });
      return;
    }

    if (messageType === "START") {
      isRunning = true;
      self.postMessage({ type: "STATUS", message: "RUNNING", snapshot: buildSnapshot() });
      ensureRunLoop();
      return;
    }

    if (messageType === "STOP") {
      isRunning = false;
      self.postMessage({ type: "STATUS", message: "PAUSED", snapshot: buildSnapshot() });
      return;
    }

    if (messageType === "STEP") {
      if (isRunning) return;
      await evolveOneGeneration();
      return;
    }

    if (messageType === "REQUEST_GENOME") {
      const genomeId = Number(payload?.id ?? payload);
      const genome = engine.getGenomeById?.(genomeId);
      self.postMessage({
        type: "GENOME_DETAILS",
        genome: genome ? serializeGenomeFull(genome, true) : null
      });
      return;
    }

    if (messageType === "UPDATE_CONFIG") {
      currentConfig = {
        ...currentConfig,
        ...(payload || {})
      };
      engine.updateConfig(payload || {});
      self.postMessage({ type: "CONFIG_UPDATED", snapshot: buildSnapshot() });
      return;
    }

    if (messageType === "STATE") {
      self.postMessage({ type: "STATE", snapshot: buildSnapshot() });
      return;
    }

    if (messageType === "UPDATE_ENV_SIZE") {
      const width = Number(payload?.width);
      const height = Number(payload?.height);
      engine.env.setWorldSize?.(width, height);
      self.postMessage({ type: "ENV_SIZE_UPDATED", snapshot: buildSnapshot() });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      message: error?.message || "Unknown worker error."
    });
  }
};
