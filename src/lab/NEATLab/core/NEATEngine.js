import { Genome } from "./Genome.js";
import { InnovationTracker } from "./InnovationTracker.js";
import { Species } from "./Species.js";

const DEFAULT_CONFIG = {
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

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function normalizeConfig(raw = {}) {
  return {
    populationSize: clampInt(
      Number(raw.populationSize ?? raw.popSize ?? DEFAULT_CONFIG.populationSize),
      20,
      500
    ),
    compatibilityThreshold: clamp(
      Number(raw.compatibilityThreshold ?? raw.compatThreshold ?? DEFAULT_CONFIG.compatibilityThreshold),
      0.5,
      8
    ),
    weightMutationRate: clamp(Number(raw.weightMutationRate ?? DEFAULT_CONFIG.weightMutationRate), 0, 1),
    addConnectionRate: clamp(Number(raw.addConnectionRate ?? DEFAULT_CONFIG.addConnectionRate), 0, 0.8),
    addNodeRate: clamp(Number(raw.addNodeRate ?? DEFAULT_CONFIG.addNodeRate), 0, 0.4),
    crossoverRate: clamp(Number(raw.crossoverRate ?? DEFAULT_CONFIG.crossoverRate), 0, 1),
    interSpeciesMateRate: clamp(
      Number(raw.interSpeciesMateRate ?? DEFAULT_CONFIG.interSpeciesMateRate),
      0,
      0.3
    ),
    survivalRate: clamp(Number(raw.survivalRate ?? DEFAULT_CONFIG.survivalRate), 0.1, 0.5),
    allowRecurrent: Boolean(raw.allowRecurrent ?? DEFAULT_CONFIG.allowRecurrent),
    activation: ["tanh", "sigmoid", "relu", "sin"].includes(raw.activation)
      ? raw.activation
      : DEFAULT_CONFIG.activation,
    maxStaleGenerations: clampInt(
      Number(raw.maxStaleGenerations ?? DEFAULT_CONFIG.maxStaleGenerations),
      3,
      60
    ),
    maxStepsPerEval: clampInt(Number(raw.maxStepsPerEval ?? DEFAULT_CONFIG.maxStepsPerEval), 160, 3000)
  };
}

function pickByFitness(genomes) {
  if (!genomes.length) return null;

  const baseline = genomes.map((genome) => Math.max(0, Number(genome.fitness || 0)));
  const total = baseline.reduce((sum, score) => sum + score, 0);
  if (total <= 0) {
    return genomes[Math.floor(Math.random() * genomes.length)];
  }

  let cursor = Math.random() * total;
  for (let i = 0; i < genomes.length; i += 1) {
    cursor -= baseline[i];
    if (cursor <= 0) return genomes[i];
  }

  return genomes[genomes.length - 1];
}

export class NEATEngine {
  constructor(environment, options = {}) {
    this.env = environment;
    this.config = normalizeConfig(options);

    this.popSize = this.config.populationSize;
    this.population = [];
    this.species = [];
    this.generation = 0;
    this.history = [];
    this.displayPopulation = [];
    this.tracker = new InnovationTracker();
    this.nextGenomeId = 0;
    this.nextSpeciesId = 0;
    this.compatThreshold = this.config.compatibilityThreshold;
    this.maxStaleGenerations = this.config.maxStaleGenerations;

    this.tracker.initializeNodeCounter(this.env.inputCount + this.env.outputCount);
    this.env.setMaxSteps?.(this.config.maxStepsPerEval);

    this.initPopulation({ clearHistory: true });
  }

  initPopulation({ clearHistory = false } = {}) {
    this.popSize = this.config.populationSize;
    this.population = [];
    this.species = [];
    this.nextSpeciesId = 0;

    if (clearHistory) {
      this.generation = 0;
      this.history = [];
    }

    for (let i = 0; i < this.popSize; i += 1) {
      const genome = new Genome(this.nextGenomeId++, this.env.inputCount, this.env.outputCount, {
        activation: this.config.activation
      });
      genome.mutateAddConnection(this.tracker, 30, {
        allowRecurrent: this.config.allowRecurrent
      });
      if (Math.random() < 0.25) {
        genome.mutateAddConnection(this.tracker, 30, {
          allowRecurrent: this.config.allowRecurrent
        });
      }
      this.population.push(genome);
    }

    this.refreshDisplayPopulation();
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(partialConfig = {}) {
    const prev = { ...this.config };
    this.config = normalizeConfig({ ...this.config, ...partialConfig });

    this.popSize = this.config.populationSize;
    this.compatThreshold = this.config.compatibilityThreshold;
    this.maxStaleGenerations = this.config.maxStaleGenerations;
    this.env.setMaxSteps?.(this.config.maxStepsPerEval);

    if (this.config.activation !== prev.activation) {
      this.population.forEach((genome) => genome.setActivation(this.config.activation));
    }

    if (this.config.populationSize !== prev.populationSize) {
      this.initPopulation({ clearHistory: true });
    }

    return this.getConfig();
  }

  async evolveOneGeneration(onProgress) {
    if (!this.population.length) return this.getStats();

    for (let i = 0; i < this.population.length; i += 1) {
      const genome = this.population[i];
      genome.fitness = Number(this.env.evaluate(genome) || 0);

      if (i % 8 === 0) {
        onProgress?.(i / this.population.length);
        await Promise.resolve();
      }
    }
    onProgress?.(1);

    this.speciate();
    this.adjustFitness();
    this.removeStaleSpecies();
    this.refreshDisplayPopulation();
    this.recordStats();

    this.population = this.createNextGeneration();
    this.generation += 1;

    return this.getStats();
  }

  refreshDisplayPopulation() {
    this.displayPopulation = this.population
      .map((genome) => genome.clone())
      .sort((a, b) => Number(b.fitness || 0) - Number(a.fitness || 0));
  }

  speciate() {
    this.species.forEach((species) => species.clearMembers());

    this.population.forEach((genome) => {
      const match = this.species.find(
        (species) => genome.compatibility(species.representative) < this.compatThreshold
      );

      if (match) {
        match.addMember(genome);
      } else {
        const newSpecies = new Species(this.nextSpeciesId++, genome);
        this.species.push(newSpecies);
      }
    });

    this.species = this.species.filter((species) => species.members.length > 0);
    this.species.forEach((species) => species.refreshRepresentative());
  }

  adjustFitness() {
    this.species.forEach((species) => {
      const divisor = Math.max(1, species.members.length);
      species.members.forEach((genome) => {
        genome.adjustedFitness = Number(genome.fitness || 0) / divisor;
      });
      species.updateStaleness();
    });
  }

  removeStaleSpecies() {
    if (!this.species.length) return;
    const globalBest = this.getBest();

    this.species = this.species.filter((species) => {
      const containsBest = species.members.some((genome) => genome.id === globalBest?.id);
      if (containsBest) return true;
      return species.staleGenerations <= this.maxStaleGenerations;
    });

    if (!this.species.length && globalBest) {
      this.species.push(new Species(this.nextSpeciesId++, globalBest));
    }
  }

  createNextGeneration() {
    if (!this.species.length) {
      return this.population.map((genome) => {
        const clone = genome.clone();
        clone.id = this.nextGenomeId++;
        clone.setActivation(this.config.activation);
        return clone;
      });
    }

    const newPopulation = [];
    const globalBest = this.getBest();
    const globalBestId = globalBest?.id ?? null;
    if (globalBest) {
      const elite = globalBest.clone();
      elite.id = this.nextGenomeId++;
      elite.fitness = 0;
      elite.adjustedFitness = 0;
      elite.speciesId = globalBest.speciesId ?? null;
      elite.setActivation(this.config.activation);
      newPopulation.push(elite);
    }

    const allAdjusted = this.species
      .flatMap((species) => species.members)
      .reduce((sum, genome) => sum + Math.max(0, Number(genome.adjustedFitness || 0)), 0);

    const speciesOffspringPlan = this.species
      .slice()
      .sort((a, b) => Number(b.bestFitness || 0) - Number(a.bestFitness || 0))
      .map((species) => {
      const speciesAdjusted = species.members.reduce(
        (sum, genome) => sum + Math.max(0, Number(genome.adjustedFitness || 0)),
        0
      );

      const rawShare = allAdjusted > 0
        ? (speciesAdjusted / allAdjusted) * this.popSize
        : this.popSize / Math.max(1, this.species.length);

      return {
        species,
        offspring: clampInt(rawShare, 1, this.popSize)
      };
    });

    speciesOffspringPlan.forEach(({ species, offspring }) => {
      species.members.sort((a, b) => Number(b.fitness || 0) - Number(a.fitness || 0));
      const championSource = species.members[0];
      const championAlreadyPreserved = championSource?.id === globalBestId;

      if (!championAlreadyPreserved && newPopulation.length < this.popSize) {
        const champion = championSource.clone();
        champion.id = this.nextGenomeId++;
        champion.speciesId = species.id;
        champion.setActivation(this.config.activation);
        newPopulation.push(champion);
      }

      const poolSize = Math.max(2, Math.floor(species.members.length * this.config.survivalRate));
      const matingPool = species.members.slice(0, poolSize);

      const childrenToCreate = Math.max(0, offspring - (championAlreadyPreserved ? 0 : 1));
      for (let i = 0; i < childrenToCreate && newPopulation.length < this.popSize; i += 1) {
        let child;
        if (Math.random() < this.config.crossoverRate && matingPool.length > 1) {
          const parent1 = pickByFitness(matingPool) || species.members[0];
          const useInterSpecies = Math.random() < this.config.interSpeciesMateRate;
          const parent2 = useInterSpecies
            ? this.selectFromOtherSpecies(species) || pickByFitness(matingPool) || species.members[0]
            : pickByFitness(matingPool) || species.members[0];

          child = Genome.crossover(
            Number(parent1.fitness || 0) >= Number(parent2.fitness || 0) ? parent1 : parent2,
            Number(parent1.fitness || 0) >= Number(parent2.fitness || 0) ? parent2 : parent1
          );
        } else {
          child = (pickByFitness(matingPool) || species.members[0]).clone();
        }

        if (Math.random() < this.config.weightMutationRate) child.mutateWeights();
        if (Math.random() < this.config.addConnectionRate) {
          child.mutateAddConnection(this.tracker, 30, {
            allowRecurrent: this.config.allowRecurrent
          });
        }
        if (Math.random() < this.config.addNodeRate) child.mutateAddNode(this.tracker);

        child.id = this.nextGenomeId++;
        child.fitness = 0;
        child.adjustedFitness = 0;
        child.speciesId = species.id;
        child.setActivation(this.config.activation);
        newPopulation.push(child);
      }
    });

    while (newPopulation.length < this.popSize) {
      const fallback = this.getBest()?.clone() || this.population[Math.floor(Math.random() * this.population.length)]?.clone();
      if (!fallback) break;
      fallback.mutateWeights();
      if (Math.random() < this.config.addConnectionRate) {
        fallback.mutateAddConnection(this.tracker, 30, {
          allowRecurrent: this.config.allowRecurrent
        });
      }
      fallback.id = this.nextGenomeId++;
      fallback.fitness = 0;
      fallback.adjustedFitness = 0;
      fallback.speciesId = null;
      fallback.setActivation(this.config.activation);
      newPopulation.push(fallback);
    }

    if (newPopulation.length > this.popSize) {
      newPopulation.length = this.popSize;
    }

    return newPopulation;
  }

  selectFromOtherSpecies(currentSpecies) {
    const others = this.species.filter((species) => species.id !== currentSpecies.id && species.members.length > 0);
    if (!others.length) return null;

    const selectedSpecies = others[Math.floor(Math.random() * others.length)];
    const poolSize = Math.max(1, Math.floor(selectedSpecies.members.length * this.config.survivalRate));
    const pool = selectedSpecies.members
      .slice()
      .sort((a, b) => Number(b.fitness || 0) - Number(a.fitness || 0))
      .slice(0, poolSize);
    return pickByFitness(pool) || pool[0] || null;
  }

  getBest() {
    if (!this.population.length) return null;
    return this.population.reduce((best, genome) => (
      Number(genome.fitness || -Infinity) > Number(best.fitness || -Infinity) ? genome : best
    ));
  }

  getDisplayPopulation() {
    return this.displayPopulation.length ? this.displayPopulation : this.population;
  }

  getDisplayBest() {
    const source = this.getDisplayPopulation();
    if (!source.length) return null;
    return source.reduce((best, genome) => (
      Number(genome.fitness || -Infinity) > Number(best.fitness || -Infinity) ? genome : best
    ));
  }

  getGenomeById(genomeId) {
    const numericId = Number(genomeId);
    if (!Number.isFinite(numericId)) return null;
    return (
      this.getDisplayPopulation().find((genome) => genome.id === numericId) ||
      this.population.find((genome) => genome.id === numericId) ||
      null
    );
  }

  recordStats() {
    if (!this.population.length) return;

    const fitnesses = this.population.map((genome) => Number(genome.fitness || 0));
    const best = this.getBest();
    const enabledConnections = best
      ? best.connections.filter((conn) => conn.enabled).length
      : 0;

    this.history.push({
      gen: this.generation,
      best: Math.max(...fitnesses),
      avg: average(fitnesses),
      worst: Math.min(...fitnesses),
      species: this.species.length,
      nodes: best ? best.nodes.length : 0,
      conns: enabledConnections,
      populationSize: this.population.length
    });

    if (this.history.length > 500) {
      this.history = this.history.slice(-500);
    }
  }

  getStats() {
    if (!this.history.length) {
      return {
        gen: this.generation,
        best: 0,
        avg: 0,
        worst: 0,
        species: this.species.length,
        nodes: 0,
        conns: 0,
        populationSize: this.population.length
      };
    }
    return this.history[this.history.length - 1];
  }
}
