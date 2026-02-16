import { BaseEnvironment } from "./BaseEnvironment.js";
import { DEFAULT_ENV_MODE, ENVIRONMENT_MODES, normalizeEnvironmentMode } from "./index.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function isFinitePoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function randomPoint(width, height, padding = 50) {
  return {
    x: padding + Math.random() * Math.max(1, width - padding * 2),
    y: padding + Math.random() * Math.max(1, height - padding * 2)
  };
}

function normalizeInputs(inputs, expectedCount) {
  const normalized = inputs.slice(0, expectedCount);
  while (normalized.length < expectedCount) normalized.push(0);
  return normalized;
}

function sanitizeObstacle(obstacle, width, height) {
  const w = clamp(Number(obstacle?.w || 28), 14, Math.max(14, width * 0.45));
  const h = clamp(Number(obstacle?.h || 28), 14, Math.max(14, height * 0.45));
  const x = clamp(Number(obstacle?.x || 0), 0, Math.max(0, width - w));
  const y = clamp(Number(obstacle?.y || 0), 0, Math.max(0, height - h));
  return { x, y, w, h };
}

function pointInObstacle(x, y, obstacle, radius = 0) {
  return (
    x + radius >= obstacle.x &&
    x - radius <= obstacle.x + obstacle.w &&
    y + radius >= obstacle.y &&
    y - radius <= obstacle.y + obstacle.h
  );
}

function rayRectIntersect(originX, originY, dirX, dirY, maxDistance, rect) {
  let tMin = 0;
  let tMax = maxDistance;

  if (Math.abs(dirX) < 1e-6) {
    if (originX < rect.x || originX > rect.x + rect.w) return -1;
  } else {
    const tx1 = (rect.x - originX) / dirX;
    const tx2 = (rect.x + rect.w - originX) / dirX;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(dirY) < 1e-6) {
    if (originY < rect.y || originY > rect.y + rect.h) return -1;
  } else {
    const ty1 = (rect.y - originY) / dirY;
    const ty2 = (rect.y + rect.h - originY) / dirY;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  if (tMax < 0 || tMin > tMax) return -1;
  if (tMin < 0) return tMax >= 0 ? 0 : -1;
  return tMin;
}

export class TargetSeeker extends BaseEnvironment {
  constructor(options = {}) {
    super();
    this.name = "NEAT Multi-Task Environment";
    this.W = Number(options.width || 760);
    this.H = Number(options.height || 460);
    this.maxSteps = Number(options.maxSteps || 400);
    this.mode = normalizeEnvironmentMode(options.mode || DEFAULT_ENV_MODE);

    this.userTarget = null;
    this.obstacles = [];
    this.multiTargets = [];

    this.setMode(this.mode);
    this.setObstacles(options.obstacles || ENVIRONMENT_MODES[this.mode].defaultObstacles || []);
    this.setMultiTargets(options.multiTargets || []);
    if (options.userTarget) this.setTarget(options.userTarget);
  }

  setMode(mode) {
    this.mode = normalizeEnvironmentMode(mode);
    const profile = ENVIRONMENT_MODES[this.mode];
    this.inputCount = profile.inputCount;
    this.outputCount = profile.outputCount;

    if (this.mode === "obstacle_avoid" && this.obstacles.length === 0) {
      this.setObstacles(profile.defaultObstacles || []);
    }
    if (this.mode !== "multi_target") {
      this.multiTargets = [];
    }
  }

  setTarget(target) {
    if (!isFinitePoint(target)) {
      this.userTarget = null;
      return;
    }
    this.userTarget = {
      x: clamp(Number(target.x), 0, this.W),
      y: clamp(Number(target.y), 0, this.H)
    };
  }

  clearTarget() {
    this.userTarget = null;
  }

  setObstacles(obstacles = []) {
    if (!Array.isArray(obstacles)) {
      this.obstacles = [];
      return;
    }
    this.obstacles = obstacles.slice(0, 24).map((obstacle) => sanitizeObstacle(obstacle, this.W, this.H));
  }

  setMultiTargets(targets = []) {
    if (!Array.isArray(targets)) {
      this.multiTargets = [];
      return;
    }
    this.multiTargets = targets
      .slice(0, 5)
      .filter(isFinitePoint)
      .map((point) => ({
        x: clamp(Number(point.x), 0, this.W),
        y: clamp(Number(point.y), 0, this.H)
      }));
  }

  updateContext(context = {}) {
    if (context.mode) this.setMode(context.mode);
    if (Array.isArray(context.obstacles)) this.setObstacles(context.obstacles);
    if (Array.isArray(context.multiTargets)) this.setMultiTargets(context.multiTargets);
  }

  getContext() {
    return {
      mode: this.mode,
      obstacles: this.obstacles.map((obstacle) => ({ ...obstacle })),
      multiTargets: this.multiTargets.map((target) => ({ ...target }))
    };
  }

  setMaxSteps(maxSteps) {
    if (!Number.isFinite(maxSteps)) return;
    this.maxSteps = Math.max(40, Math.floor(maxSteps));
  }

  setWorldSize(width, height) {
    if (Number.isFinite(width) && width > 120) this.W = Math.floor(width);
    if (Number.isFinite(height) && height > 120) this.H = Math.floor(height);
    if (this.userTarget) this.setTarget(this.userTarget);
    this.setObstacles(this.obstacles);
    this.setMultiTargets(this.multiTargets);
  }

  getRaycastInputs(agentX, agentY, heading, obstacles) {
    const rayLength = 170;
    const rayAngles = [0, -Math.PI / 3, -Math.PI / 6, Math.PI / 6, Math.PI / 3];
    const inputs = [];

    for (let i = 0; i < rayAngles.length; i += 1) {
      const angle = heading + rayAngles[i];
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      let minDistance = rayLength;

      for (let j = 0; j < obstacles.length; j += 1) {
        const hit = rayRectIntersect(agentX, agentY, dx, dy, rayLength, obstacles[j]);
        if (hit >= 0) minDistance = Math.min(minDistance, hit);
      }

      inputs.push(minDistance / rayLength);
    }

    return inputs;
  }

  buildModeInputs({ dx, dy, dist, vx, vy, ax, ay, heading, targetIndex, targets }) {
    const diagonal = Math.max(1, Math.hypot(this.W, this.H));
    const base = [
      dx / this.W,
      dy / this.H,
      dist / diagonal,
      vx / 10,
      vy / 10,
      (ax / this.W) * 2 - 1,
      (ay / this.H) * 2 - 1
    ];

    if (this.mode === "target_seeker") {
      return normalizeInputs(base, this.inputCount);
    }

    if (this.mode === "obstacle_avoid") {
      const rayInputs = this.getRaycastInputs(ax, ay, heading, this.obstacles);
      return normalizeInputs([...base.slice(0, 5), ...rayInputs], this.inputCount);
    }

    const targetsCount = Math.max(1, targets.length);
    const progressInputs = [
      targetIndex / Math.max(1, targetsCount - 1),
      (targetsCount - targetIndex) / targetsCount
    ];
    return normalizeInputs([...base, ...progressInputs], this.inputCount);
  }

  resolveTargetsForTrial() {
    if (this.mode === "multi_target") {
      if (this.multiTargets.length >= 2) {
        return this.multiTargets.map((target) => ({ ...target }));
      }
      return this.generateTargets(3);
    }

    const target = this.userTarget ? { ...this.userTarget } : randomPoint(this.W, this.H, 50);
    return [target];
  }

  evaluate(genome) {
    const trials = 3;
    let totalFitness = 0;

    for (let trial = 0; trial < trials; trial += 1) {
      const start = randomPoint(this.W, this.H, 50);
      let agentX = start.x;
      let agentY = start.y;
      let velocityX = 0;
      let velocityY = 0;
      let heading = 0;
      let trialFitness = 0;
      let collisionPenalty = 0;

      const targets = this.resolveTargetsForTrial();
      let targetIndex = 0;
      let target = targets[targetIndex];
      if (!target) continue;

      let initialDistance = Math.max(1, distance(agentX, agentY, target.x, target.y));

      for (let step = 0; step < this.maxSteps; step += 1) {
        const prevX = agentX;
        const prevY = agentY;

        const dx = target.x - agentX;
        const dy = target.y - agentY;
        const dist = Math.max(1e-6, Math.hypot(dx, dy));

        const inputs = this.buildModeInputs({
          dx,
          dy,
          dist,
          vx: velocityX,
          vy: velocityY,
          ax: agentX,
          ay: agentY,
          heading,
          targetIndex,
          targets
        });

        const [outX, outY] = genome.activate(inputs);

        velocityX = (velocityX + Number(outX || 0) * 1.5) * 0.9;
        velocityY = (velocityY + Number(outY || 0) * 1.5) * 0.9;

        agentX += velocityX;
        agentY += velocityY;

        if (agentX < 0 || agentX > this.W) velocityX *= -0.5;
        if (agentY < 0 || agentY > this.H) velocityY *= -0.5;

        agentX = clamp(agentX, 0, this.W);
        agentY = clamp(agentY, 0, this.H);

        heading = Math.atan2(velocityY, velocityX || 1e-6);

        if (this.mode === "obstacle_avoid") {
          const collided = this.obstacles.some((obstacle) => pointInObstacle(agentX, agentY, obstacle, 7));
          if (collided) {
            agentX = prevX;
            agentY = prevY;
            velocityX *= -0.4;
            velocityY *= -0.4;
            collisionPenalty += 5;
          }
        }

        const newDistance = distance(agentX, agentY, target.x, target.y);
        const progress = (initialDistance - newDistance) / Math.max(initialDistance, 1);
        trialFitness += progress;

        if (newDistance < 20) {
          trialFitness += (this.maxSteps - step) * 2;
          if (this.mode === "multi_target" && targetIndex < targets.length - 1) {
            targetIndex += 1;
            target = targets[targetIndex];
            initialDistance = Math.max(1, distance(agentX, agentY, target.x, target.y));
          } else {
            break;
          }
        }
      }

      totalFitness += Math.max(0, trialFitness - collisionPenalty);
    }

    return Math.max(0, totalFitness / trials);
  }

  createVisualState(genome = null) {
    const target = this.userTarget || randomPoint(this.W, this.H, 50);
    const start = randomPoint(this.W, this.H, 50);
    return {
      step: 0,
      done: false,
      fitness: 0,
      agentX: start.x,
      agentY: start.y,
      velocityX: 0,
      velocityY: 0,
      targetX: target.x,
      targetY: target.y,
      trail: [],
      activeValues: genome?.lastActivations ? { ...genome.lastActivations } : {}
    };
  }

  stepVisual(genome, state) {
    if (!state || state.done) return state;
    const target = this.userTarget || { x: state.targetX, y: state.targetY };

    const dx = target.x - state.agentX;
    const dy = target.y - state.agentY;
    const dist = Math.max(1e-6, Math.hypot(dx, dy));
    const heading = Math.atan2(state.velocityY, state.velocityX || 1e-6);

    const inputs = this.buildModeInputs({
      dx,
      dy,
      dist,
      vx: state.velocityX,
      vy: state.velocityY,
      ax: state.agentX,
      ay: state.agentY,
      heading,
      targetIndex: 0,
      targets: [target]
    });

    const { outputs, activations } = genome.activateDetailed(inputs);
    const [outX, outY] = outputs;

    let velocityX = (state.velocityX + Number(outX || 0) * 1.5) * 0.9;
    let velocityY = (state.velocityY + Number(outY || 0) * 1.5) * 0.9;

    let agentX = state.agentX + velocityX;
    let agentY = state.agentY + velocityY;

    if (agentX < 0 || agentX > this.W) velocityX *= -0.5;
    if (agentY < 0 || agentY > this.H) velocityY *= -0.5;
    agentX = clamp(agentX, 0, this.W);
    agentY = clamp(agentY, 0, this.H);

    const trail = [...(state.trail || []), { x: agentX, y: agentY }];
    if (trail.length > 40) trail.shift();

    return {
      ...state,
      step: state.step + 1,
      done: state.step + 1 >= this.maxSteps || distance(agentX, agentY, target.x, target.y) < 20,
      fitness: Number(state.fitness || 0) + 1 / (dist + 1),
      agentX,
      agentY,
      velocityX,
      velocityY,
      targetX: target.x,
      targetY: target.y,
      trail,
      activeValues: activations
    };
  }

  generateTargets(count) {
    const targets = [];
    for (let i = 0; i < count; i += 1) {
      targets.push(randomPoint(this.W, this.H, 60));
    }
    return targets;
  }
}
