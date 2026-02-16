export class BaseEnvironment {
  constructor() {
    this.name = "Base Environment";
    this.inputCount = 0;
    this.outputCount = 0;
    this.maxSteps = 0;
  }

  evaluate(_genome) {
    throw new Error("evaluate(genome) must be implemented by environment subclasses.");
  }

  createVisualState() {
    return {};
  }

  stepVisual(_genome, state) {
    return state;
  }

  setTarget(_target) {
    // optional in concrete environments
  }

  clearTarget() {
    // optional in concrete environments
  }

  setMaxSteps(_maxSteps) {
    // optional in concrete environments
  }

  setWorldSize(_width, _height) {
    // optional in concrete environments
  }

  setMode(_mode) {
    // optional in concrete environments
  }

  setObstacles(_obstacles) {
    // optional in concrete environments
  }

  setMultiTargets(_targets) {
    // optional in concrete environments
  }

  updateContext(_context) {
    // optional in concrete environments
  }

  getContext() {
    return {};
  }
}
