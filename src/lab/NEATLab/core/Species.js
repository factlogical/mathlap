function clampNonNegative(value) {
  return Math.max(0, Number(value) || 0);
}

export class Species {
  constructor(id, representative) {
    this.id = id;
    this.representative = representative.clone();
    this.members = [];
    this.bestFitness = -Infinity;
    this.staleGenerations = 0;

    if (representative) this.addMember(representative);
  }

  addMember(genome) {
    genome.speciesId = this.id;
    this.members.push(genome);
  }

  clearMembers() {
    this.members = [];
  }

  refreshRepresentative() {
    if (!this.members.length) return;
    const index = Math.floor(Math.random() * this.members.length);
    this.representative = this.members[index].clone();
  }

  getAverageFitness() {
    if (!this.members.length) return 0;
    const total = this.members.reduce((sum, genome) => sum + clampNonNegative(genome.fitness), 0);
    return total / this.members.length;
  }

  updateStaleness() {
    if (!this.members.length) return;
    const currentBest = this.members.reduce(
      (best, genome) => Math.max(best, Number(genome.fitness || 0)),
      -Infinity
    );

    if (currentBest > this.bestFitness) {
      this.bestFitness = currentBest;
      this.staleGenerations = 0;
    } else {
      this.staleGenerations += 1;
    }
  }

  selectByFitness() {
    if (!this.members.length) return null;
    const baseline = this.members.map((genome) => clampNonNegative(genome.fitness));
    const total = baseline.reduce((sum, fitness) => sum + fitness, 0);

    if (total <= 0) {
      const fallbackIndex = Math.floor(Math.random() * this.members.length);
      return this.members[fallbackIndex];
    }

    let cursor = Math.random() * total;
    for (let i = 0; i < this.members.length; i += 1) {
      cursor -= baseline[i];
      if (cursor <= 0) return this.members[i];
    }

    return this.members[this.members.length - 1];
  }
}
