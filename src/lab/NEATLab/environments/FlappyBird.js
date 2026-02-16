import { BaseEnvironment } from "./BaseEnvironment.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

function hashSeed(seed) {
  let value = (Math.floor(Number(seed) || 1) >>> 0) || 1;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0 || 1;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function nextGapTop(previousGapTop, height, gap, rng = Math.random) {
  const minTop = 60;
  const maxTop = Math.max(minTop + 1, height - 60 - gap);
  if (!Number.isFinite(previousGapTop)) {
    return randomBetween(minTop, maxTop, rng);
  }

  // Keep obstacle flow smooth so difficulty feels progressive, not random spikes.
  const drift = Math.max(30, gap * 0.38);
  return clamp(previousGapTop + randomBetween(-drift, drift, rng), minTop, maxTop);
}

export class FlappyBirdEnv extends BaseEnvironment {
  constructor(options = {}) {
    super();
    this.name = "Flappy Bird Lite";
    this.icon = "\uD83D\uDC26";
    this.inputCount = 5;
    this.outputCount = 1;

    this.W = Number(options.width || 800);
    this.H = Number(options.height || 500);

    this.BIRD_X = 86;
    this.BASE_GRAVITY = 0.4;
    this.GRAVITY_BOOST = 0.08;
    this.BASE_JUMP_FORCE = -6.8;
    this.JUMP_NERF = 0.35;
    this.BASE_PIPE_SPEED = 2.9;
    this.MAX_PIPE_SPEED = 5.4;
    this.EXTRA_PIPE_SPEED_BOOST = 1.7;
    this.PIPE_WIDTH = 56;
    this.BASE_PIPE_GAP = 132;
    this.MIN_PIPE_GAP = 88;
    this.HARD_MIN_PIPE_GAP = 66;
    this.EXTRA_GAP_SHRINK = 16;
    this.EXTRA_GRAVITY_BOOST = 0.07;
    this.EXTRA_JUMP_NERF = 0.26;
    this.PIPE_INTERVAL = 170;
    this.MAX_PIPES = 5;
    this.maxSteps = Number(options.maxSteps || 1000);
    this.evalTrials = clamp(Math.floor(Number(options.evalTrials || 4)), 2, 8);
    this.evalSeed = hashSeed(options.evalSeed ?? 1337);
  }

  setMaxSteps(maxSteps) {
    if (!Number.isFinite(maxSteps)) return;
    this.maxSteps = clamp(Math.floor(maxSteps), 160, 3000);
  }

  setWorldSize(width, height) {
    if (Number.isFinite(width) && width > 320) this.W = Math.floor(width);
    if (Number.isFinite(height) && height > 220) this.H = Math.floor(height);
  }

  getContext() {
    return { mode: "flappy_bird" };
  }

  setEvaluationProfile({ trials, seed } = {}) {
    if (Number.isFinite(trials)) {
      this.evalTrials = clamp(Math.floor(trials), 2, 8);
    }
    if (seed != null && Number.isFinite(Number(seed))) {
      this.evalSeed = hashSeed(Number(seed));
    }
  }

  getDifficulty(frame = 0) {
    const baseRamp = clamp(frame / Math.max(1400, this.maxSteps * 1.4), 0, 1);
    const longRamp = clamp(frame / Math.max(5200, this.maxSteps * 4.2), 0, 1);
    const pipeGap = clamp(
      this.BASE_PIPE_GAP
        - (this.BASE_PIPE_GAP - this.MIN_PIPE_GAP) * baseRamp
        - this.EXTRA_GAP_SHRINK * longRamp,
      this.HARD_MIN_PIPE_GAP,
      this.BASE_PIPE_GAP
    );
    return {
      ramp: baseRamp + longRamp * 0.9,
      gravity: this.BASE_GRAVITY + this.GRAVITY_BOOST * baseRamp + this.EXTRA_GRAVITY_BOOST * longRamp,
      jump: this.BASE_JUMP_FORCE + this.JUMP_NERF * baseRamp + this.EXTRA_JUMP_NERF * longRamp,
      pipeSpeed:
        this.BASE_PIPE_SPEED
        + (this.MAX_PIPE_SPEED - this.BASE_PIPE_SPEED) * baseRamp
        + this.EXTRA_PIPE_SPEED_BOOST * longRamp,
      pipeGap: Math.round(pipeGap)
    };
  }

  buildTrialSeed(trialIndex = 0) {
    return hashSeed(this.evalSeed + trialIndex * 104729);
  }

  newPipe(afterX = this.W, { gap = this.BASE_PIPE_GAP, rng = Math.random, previousGapTop = null } = {}) {
    const safeGap = clamp(Math.round(gap), this.HARD_MIN_PIPE_GAP, this.BASE_PIPE_GAP);
    return {
      x: afterX + this.PIPE_INTERVAL,
      gapTop: nextGapTop(previousGapTop, this.H, safeGap, rng),
      gap: safeGap,
      passed: false
    };
  }

  generateInitialPipes(difficulty = this.getDifficulty(0), rng = Math.random) {
    const pipes = [];
    let cursor = this.W - this.PIPE_INTERVAL * 0.2;
    let previousGapTop = null;
    for (let i = 0; i < this.MAX_PIPES; i += 1) {
      const pipe = this.newPipe(cursor, {
        gap: difficulty.pipeGap,
        rng,
        previousGapTop
      });
      pipes.push(pipe);
      cursor = pipe.x;
      previousGapTop = pipe.gapTop;
    }
    return pipes;
  }

  getNextPipe(pipes) {
    return pipes.find((pipe) => pipe.x + this.PIPE_WIDTH * 0.5 > this.BIRD_X) || pipes[0];
  }

  checkCollision(y, pipe) {
    if (y < 0 || y > this.H) return true;
    if (!pipe) return false;

    const inPipeRange = Math.abs(pipe.x - this.BIRD_X) < this.PIPE_WIDTH * 0.5;
    if (!inPipeRange) return false;

    const gap = Number(pipe.gap || this.BASE_PIPE_GAP);
    return y < pipe.gapTop || y > pipe.gapTop + gap;
  }

  buildInputs(y, vy, pipe) {
    if (!pipe) return [0, 0, 0, 0, 0];
    const gap = Number(pipe.gap || this.BASE_PIPE_GAP);
    return [
      y / this.H,
      vy / 20,
      (pipe.x - this.BIRD_X) / this.W,
      pipe.gapTop / this.H,
      (pipe.gapTop + gap) / this.H
    ];
  }

  createEpisode({ seed } = {}) {
    const rng = Number.isFinite(Number(seed))
      ? createSeededRandom(Number(seed))
      : Math.random;
    const difficulty = this.getDifficulty(0);
    return {
      y: this.H * 0.5 + randomBetween(-this.H * 0.08, this.H * 0.08, rng),
      vy: 0,
      pipes: this.generateInitialPipes(difficulty, rng),
      frame: 0,
      score: 0,
      alive: true,
      rng
    };
  }

  stepEpisode(genome, episode) {
    if (!episode.alive) return true;

    const difficulty = this.getDifficulty(episode.frame);
    const pipe = this.getNextPipe(episode.pipes);
    const inputs = this.buildInputs(episode.y, episode.vy, pipe);
    const [jump] = genome.activate(inputs);

    if (jump > 0.5) {
      episode.vy = difficulty.jump;
    }

    episode.vy += difficulty.gravity;
    episode.y += episode.vy;

    episode.pipes.forEach((item) => {
      item.x -= difficulty.pipeSpeed;
    });

    if (episode.pipes[0] && episode.pipes[0].x < -this.PIPE_WIDTH) {
      const lastX = episode.pipes[episode.pipes.length - 1]?.x ?? this.W;
      const previousGapTop = episode.pipes[episode.pipes.length - 1]?.gapTop ?? null;
      episode.pipes.shift();
      episode.pipes.push(this.newPipe(lastX, {
        gap: difficulty.pipeGap,
        rng: episode.rng || Math.random,
        previousGapTop
      }));
    }

    const nextPipe = this.getNextPipe(episode.pipes);
    if (this.checkCollision(episode.y, nextPipe)) {
      episode.alive = false;
      return true;
    }

    if (pipe && pipe.x + this.PIPE_WIDTH * 0.5 < this.BIRD_X && !pipe.passed) {
      pipe.passed = true;
      episode.score += 12;
    }

    const nextGap = Number(nextPipe.gap || this.BASE_PIPE_GAP);
    const gapCenter = (nextPipe.gapTop + nextGap * 0.5);
    const centerReward = 1 - Math.min(1, Math.abs(episode.y - gapCenter) / (nextGap * 0.5));
    episode.score += 0.1 + Math.max(0, centerReward) * 0.06 + difficulty.ramp * 0.03;
    episode.frame += 1;

    if (episode.frame >= this.maxSteps) {
      episode.alive = false;
      return true;
    }

    return false;
  }

  evaluate(genome) {
    const trials = this.evalTrials;
    let total = 0;

    for (let i = 0; i < trials; i += 1) {
      const episode = this.createEpisode({ seed: this.buildTrialSeed(i) });
      while (!this.stepEpisode(genome, episode)) {
        // run until terminal state
      }
      total += episode.score;
    }

    return Math.max(0, total / trials);
  }
}
