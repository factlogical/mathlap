export class InnovationTracker {
  constructor() {
    this.nextInnovation = 0;
    this.nextNodeId = 0;
    this.connectionInnovations = new Map();
  }

  initializeNodeCounter(startId) {
    this.nextNodeId = Math.max(this.nextNodeId, Number(startId) || 0);
  }

  getInnovation(fromNode, toNode) {
    const key = `${fromNode}->${toNode}`;
    if (this.connectionInnovations.has(key)) {
      return this.connectionInnovations.get(key);
    }
    const innovation = this.nextInnovation;
    this.connectionInnovations.set(key, innovation);
    this.nextInnovation += 1;
    return innovation;
  }

  getNewNodeId() {
    const id = this.nextNodeId;
    this.nextNodeId += 1;
    return id;
  }
}
