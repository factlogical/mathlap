import { useEffect, useMemo, useRef, useState } from "react";
import { useUISettings } from "../../../context/UISettingsContext.jsx";
import { Genome } from "../core/Genome.js";
import NetworkCanvas from "./shared/NetworkCanvas.jsx";

const FLAPPY = {
  birdX: 86,
  baseGravity: 0.4,
  gravityBoost: 0.08,
  baseJump: -6.8,
  jumpNerf: 0.35,
  basePipeSpeed: 2.9,
  maxPipeSpeed: 5.4,
  extraPipeSpeedBoost: 1.7,
  pipeWidth: 56,
  basePipeGap: 132,
  minPipeGap: 88,
  hardMinPipeGap: 66,
  extraGapShrink: 16,
  extraGravityBoost: 0.07,
  extraJumpNerf: 0.26,
  pipeInterval: 170,
  maxPipes: 5
};

const VISUAL_SEED = 20240214;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fmt(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(digits);
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

function randomBetween(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

function nextGapTop(previousGapTop, height, gap, rng = Math.random) {
  const minTop = 60;
  const maxTop = Math.max(minTop + 1, height - 60 - gap);
  if (!Number.isFinite(previousGapTop)) {
    return randomBetween(minTop, maxTop, rng);
  }

  const drift = Math.max(30, gap * 0.38);
  return clamp(previousGapTop + randomBetween(-drift, drift, rng), minTop, maxTop);
}

function createPipe(afterX, height, gap = FLAPPY.basePipeGap, rng = Math.random, previousGapTop = null) {
  const safeGap = clamp(Math.round(gap), FLAPPY.hardMinPipeGap, FLAPPY.basePipeGap);
  return {
    x: afterX + FLAPPY.pipeInterval,
    gapTop: nextGapTop(previousGapTop, height, safeGap, rng),
    gap: safeGap,
    passedBy: new Set()
  };
}

function buildPipes(width, height, gap = FLAPPY.basePipeGap, rng = Math.random) {
  const pipes = [];
  let cursor = width - FLAPPY.pipeInterval * 0.2;
  let previousGapTop = null;
  for (let i = 0; i < FLAPPY.maxPipes; i += 1) {
    const pipe = createPipe(cursor, height, gap, rng, previousGapTop);
    pipes.push(pipe);
    cursor = pipe.x;
    previousGapTop = pipe.gapTop;
  }
  return pipes;
}

function getNextPipe(pipes) {
  return pipes.find((pipe) => pipe.x + FLAPPY.pipeWidth * 0.5 > FLAPPY.birdX) || pipes[0];
}

function checkCollision(y, pipe, height) {
  if (y < 0 || y > height) return true;
  if (!pipe) return false;

  const gap = Number(pipe.gap || FLAPPY.basePipeGap);
  const inPipeRange = Math.abs(pipe.x - FLAPPY.birdX) < FLAPPY.pipeWidth * 0.5;
  if (!inPipeRange) return false;
  return y < pipe.gapTop || y > pipe.gapTop + gap;
}

function hydrateGenome(source) {
  if (!source || !Array.isArray(source.nodes) || !Array.isArray(source.connections)) return null;
  const genome = new Genome(source.id ?? 0, 0, 0, { activation: source.activation || "tanh" });
  genome.nodes = source.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    bias: Number(node.bias || 0)
  }));
  genome.connections = source.connections.map((conn) => ({
    fromNode: conn.fromNode,
    toNode: conn.toNode,
    weight: Number(conn.weight || 0),
    enabled: conn.enabled !== false,
    innovation: conn.innovation
  }));
  genome.fitness = Number(source.fitness || 0);
  genome.adjustedFitness = Number(source.adjustedFitness || 0);
  genome.speciesId = source.speciesId ?? null;
  return genome;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function createBirds(population, hydratedMap, height, generation = 0) {
  const maxFitness = Math.max(1, ...population.map((item) => Number(item.fitness || 0)));

  return population.map((item, index) => {
    const seed = hashSeed((item.id + 1) * 2654435761 + generation * 374761393 + 17);
    const unit = seed / 4294967295;
    return {
      id: item.id,
      genome: hydratedMap.get(item.id) || null,
      y: height * 0.5 + (unit - 0.5) * height * 0.18,
      vy: 0,
      alive: true,
      score: 0,
      fitness: Number(item.fitness || 0),
      norm: clamp(Number(item.fitness || 0) / maxFitness, 0, 1),
      speciesId: item.speciesId,
      phase: (index / Math.max(1, population.length)) * Math.PI * 2,
      activations: {}
    };
  });
}

function heuristicJump(bird, pipe) {
  if (!pipe) return false;
  const gap = Number(pipe.gap || FLAPPY.basePipeGap);
  const distX = pipe.x - FLAPPY.birdX;
  const urgency = distX < 120;
  const desiredY = pipe.gapTop + gap * (0.56 - bird.norm * 0.09);
  return urgency && bird.y > desiredY;
}

function getDifficulty(frame = 0) {
  const baseRamp = clamp(frame / 1400, 0, 1);
  const longRamp = clamp(frame / 5200, 0, 1);
  const pipeGap = clamp(
    FLAPPY.basePipeGap
      - (FLAPPY.basePipeGap - FLAPPY.minPipeGap) * baseRamp
      - FLAPPY.extraGapShrink * longRamp,
    FLAPPY.hardMinPipeGap,
    FLAPPY.basePipeGap
  );
  return {
    ramp: baseRamp + longRamp * 0.9,
    gravity: FLAPPY.baseGravity + FLAPPY.gravityBoost * baseRamp + FLAPPY.extraGravityBoost * longRamp,
    jump: FLAPPY.baseJump + FLAPPY.jumpNerf * baseRamp + FLAPPY.extraJumpNerf * longRamp,
    pipeSpeed:
      FLAPPY.basePipeSpeed
      + (FLAPPY.maxPipeSpeed - FLAPPY.basePipeSpeed) * baseRamp
      + FLAPPY.extraPipeSpeedBoost * longRamp,
    pipeGap: Math.round(pipeGap)
  };
}

function drawBackground(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#10233f");
  sky.addColorStop(1, "#071225");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(147,197,253,0.06)";
  for (let y = 0; y <= height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawPipes(ctx, pipes, height) {
  pipes.forEach((pipe) => {
    const x = pipe.x - FLAPPY.pipeWidth / 2;
    const gap = Number(pipe.gap || FLAPPY.basePipeGap);
    const bottomY = pipe.gapTop + gap;

    ctx.fillStyle = "#15803d";
    ctx.strokeStyle = "#166534";
    ctx.lineWidth = 2;

    ctx.fillRect(x, 0, FLAPPY.pipeWidth, pipe.gapTop);
    ctx.strokeRect(x, 0, FLAPPY.pipeWidth, pipe.gapTop);

    ctx.fillRect(x, bottomY, FLAPPY.pipeWidth, height - bottomY);
    ctx.strokeRect(x, bottomY, FLAPPY.pipeWidth, height - bottomY);

    ctx.fillStyle = "#16a34a";
    ctx.fillRect(x - 4, pipe.gapTop - 18, FLAPPY.pipeWidth + 8, 18);
    ctx.fillRect(x - 4, bottomY, FLAPPY.pipeWidth + 8, 18);
  });
}

function drawBird(ctx, bird, isBest, isSelected) {
  const radius = isBest ? 12 : isSelected ? 10 : 8;

  if (isBest) {
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 18;
  }

  ctx.fillStyle = isBest ? "#22c55e" : isSelected ? "#a78bfa" : "#60a5fa";
  ctx.beginPath();
  ctx.arc(FLAPPY.birdX, bird.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(FLAPPY.birdX + radius * 0.25, bird.y - radius * 0.25, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(FLAPPY.birdX + radius * 0.6, bird.y - 2, 7, 4);
}

function drawHud(ctx, stats, isArabic, t, height) {
  const x = 10;
  const y = 10;
  const w = 260;
  const h = 166;
  const textAlign = isArabic ? "right" : "left";
  const textX = isArabic ? x + w - 10 : x + 10;
  const bottomTextX = isArabic ? 280 : 20;
  const evalProgress = `${Math.round(clamp(Number(stats.progress || 0), 0, 1) * 100)}%`;

  ctx.fillStyle = "rgba(2,6,23,0.72)";
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fill();

  ctx.strokeStyle = "rgba(51,65,85,0.95)";
  ctx.stroke();

  ctx.font = "12px Cairo, sans-serif";
  ctx.textAlign = textAlign;
  ctx.fillStyle = "#93c5fd";
  ctx.fillText(`${t("الجيل", "Generation")}: ${stats.generation}`, textX, y + 24);

  ctx.fillStyle = "#22c55e";
  ctx.fillText(`${t("الأحياء", "Alive")}: ${stats.aliveCount}/${stats.total}`, textX, y + 46);

  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`${t("أفضل نتيجة", "Best Score")}: ${fmt(stats.bestScore, 0)}`, textX, y + 68);

  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`${t("الإطار", "Frame")}: ${stats.frame}`, textX, y + 90);

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`${t("تقدم التقييم", "Eval Progress")}: ${evalProgress}`, textX, y + 112);

  ctx.fillStyle = "#67e8f9";
  ctx.fillText(`${t("سرعة الأنابيب", "Pipe Speed")}: ${fmt(stats.pipeSpeed, 2)}`, textX, y + 134);

  ctx.fillStyle = "#fca5a5";
  ctx.fillText(`${t("حجم الفتحة", "Gap Size")}: ${Math.round(Number(stats.pipeGap || FLAPPY.basePipeGap))}px`, textX, y + 156);

  ctx.fillStyle = "rgba(2,6,23,0.68)";
  roundRectPath(ctx, 10, height - 62, 280, 52, 10);
  ctx.fill();

  ctx.font = "11px Cairo, sans-serif";
  ctx.textAlign = textAlign;
  ctx.fillStyle = "#60a5fa";
  ctx.fillText(`- ${t("طيور حية", "Alive birds")}`, bottomTextX, height - 40);
  ctx.fillStyle = "#22c55e";
  ctx.fillText(`- ${t("أفضل طائر", "Best bird")}`, bottomTextX, height - 24);
}

export default function EnvironmentView({
  population = [],
  genomeDetailsById = {},
  bestGenome,
  selectedGenome,
  stats,
  progress = 0,
  isRunning,
  viewOptions,
  onSelectGenome
}) {
  const { isArabic, t } = useUISettings();

  const showSidePanels = viewOptions?.showSidePanels !== false;
  const showHud = viewOptions?.showHud !== false;
  const showExplanations = viewOptions?.showExplanations !== false;

  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const playingRef = useRef(false);
  const progressRef = useRef(0);
  const hudUpdateRef = useRef(0);
  const activeValuesUpdateRef = useRef(0);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualStats, setVisualStats] = useState({
    generation: 0,
    aliveCount: 0,
    total: 0,
    bestScore: 0,
    frame: 0,
    pipeSpeed: FLAPPY.basePipeSpeed,
    pipeGap: FLAPPY.basePipeGap
  });
  const [activeValues, setActiveValues] = useState({});
  const latestDataRef = useRef({
    population: [],
    hydratedMap: new Map(),
    generation: 0,
    token: "0:none:0"
  });

  const hydratedMap = useMemo(() => {
    const map = new Map();
    Object.values(genomeDetailsById || {}).forEach((source) => {
      const genome = hydrateGenome(source);
      if (genome?.id != null) map.set(genome.id, genome);
    });

    const bestHydrated = hydrateGenome(bestGenome);
    if (bestHydrated?.id != null) map.set(bestHydrated.id, bestHydrated);

    const selectedHydrated = hydrateGenome(selectedGenome);
    if (selectedHydrated?.id != null) map.set(selectedHydrated.id, selectedHydrated);

    return map;
  }, [bestGenome, genomeDetailsById, selectedGenome]);

  const selectedId = selectedGenome?.id ?? null;
  const selectedHydrated = selectedId != null ? hydratedMap.get(selectedId) || null : null;
  const bestHydrated = useMemo(() => hydrateGenome(bestGenome), [bestGenome]);
  const focusGenome = selectedHydrated || bestHydrated;
  const focusOutputs = useMemo(() => {
    if (!focusGenome?.nodes?.length) return [];
    return focusGenome.nodes
      .filter((node) => node.type === "output")
      .sort((a, b) => a.id - b.id)
      .map((node) => ({
        id: node.id,
        value: Number(activeValues?.[node.id] || 0)
      }));
  }, [activeValues, focusGenome]);

  const buildSimulation = (input = latestDataRef.current) => {
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    if (!input.population.length || !width || !height) {
      simRef.current = null;
      return;
    }

    const selectedBirdId = selectedGenome?.id ?? null;
    const difficulty = getDifficulty(0);
    const birds = createBirds(
      input.population,
      input.hydratedMap,
      height,
      Number(input.generation || 0)
    ).map((bird, index) => {
      const shouldRunNetwork = index < 36 || bird.id === selectedBirdId;
      return shouldRunNetwork
        ? bird
        : { ...bird, genome: null };
    });

    const rng = createSeededRandom(VISUAL_SEED);

    simRef.current = {
      birds,
      pipes: buildPipes(width, height, difficulty.pipeGap, rng),
      frame: 0,
      generation: Number(input.generation || 0),
      token: input.token,
      total: birds.length,
      difficulty,
      done: false,
      doneAt: 0,
      bestBirdId: birds[0]?.id ?? null,
      bestScore: 0,
      pendingData: null,
      rng
    };

    setVisualStats({
      generation: Number(input.generation || 0),
      aliveCount: birds.length,
      total: birds.length,
      bestScore: 0,
      frame: 0,
      pipeSpeed: difficulty.pipeSpeed,
      pipeGap: difficulty.pipeGap
    });
  };

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (isRunning) setIsPlaying(true);
  }, [isRunning]);

  useEffect(() => {
    progressRef.current = clamp(Number(progress || 0), 0, 1);
  }, [progress]);

  useEffect(() => {
    const generation = Number(stats?.gen || 0);
    const leadId = population[0]?.id ?? "none";
    const token = `${generation}:${leadId}:${population.length}`;

    latestDataRef.current = {
      population,
      hydratedMap,
      generation,
      token
    };

    if (!size.width || !size.height) return;
    if (!simRef.current) {
      buildSimulation(latestDataRef.current);
      return;
    }

    if (simRef.current.token === token) {
      return;
    }

    if (simRef.current.done) {
      buildSimulation(latestDataRef.current);
      return;
    }

    simRef.current.pendingData = latestDataRef.current;
  }, [hydratedMap, population, size.height, size.width, stats?.gen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return undefined;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let raf = 0;

    const frame = (time) => {
      const sim = simRef.current;
      if (!sim) {
        drawBackground(ctx, size.width, size.height);
        raf = requestAnimationFrame(frame);
        return;
      }

      const width = size.width;
      const height = size.height;
      const difficulty = getDifficulty(sim.frame);
      sim.difficulty = difficulty;

      if (playingRef.current && !sim.done) {
        const nextPipeBeforeMove = getNextPipe(sim.pipes);

        sim.birds.forEach((bird) => {
          if (!bird.alive) return;

          const pipe = nextPipeBeforeMove || getNextPipe(sim.pipes);
          let jump = false;

          if (bird.genome) {
            const inputs = [
              bird.y / height,
              bird.vy / 20,
              ((pipe?.x ?? width) - FLAPPY.birdX) / Math.max(1, width),
              (pipe?.gapTop ?? (height * 0.3)) / Math.max(1, height),
              ((pipe?.gapTop ?? (height * 0.3)) + Number(pipe?.gap ?? FLAPPY.basePipeGap)) / Math.max(1, height)
            ];

            const { outputs, activations } = bird.genome.activateDetailed(inputs);
            jump = Number(outputs?.[0] ?? 0) > 0.5;
            bird.activations = activations || {};
          } else {
            jump = heuristicJump(bird, pipe);
          }

          if (jump) bird.vy = difficulty.jump;

          bird.vy += difficulty.gravity;
          bird.y += bird.vy;

          if (pipe && pipe.x + FLAPPY.pipeWidth * 0.5 < FLAPPY.birdX && !pipe.passedBy.has(bird.id)) {
            pipe.passedBy.add(bird.id);
            bird.score += 10;
          }

          bird.score += 0.1;

          if (checkCollision(bird.y, pipe, height)) {
            bird.alive = false;
          }
        });

        sim.pipes.forEach((pipe) => {
          pipe.x -= difficulty.pipeSpeed;
        });

        if (sim.pipes[0] && sim.pipes[0].x < -FLAPPY.pipeWidth) {
          const lastX = sim.pipes[sim.pipes.length - 1]?.x ?? width;
          const previousGapTop = sim.pipes[sim.pipes.length - 1]?.gapTop ?? null;
          sim.pipes.shift();
          sim.pipes.push(createPipe(lastX, height, difficulty.pipeGap, sim.rng, previousGapTop));
        }

        sim.frame += 1;

        let aliveCount = 0;
        let bestBird = null;
        sim.birds.forEach((bird) => {
          if (bird.alive) aliveCount += 1;
          if (!bestBird || bird.score > bestBird.score) bestBird = bird;
        });

        sim.bestBirdId = bestBird?.id ?? null;
        sim.bestScore = bestBird?.score ?? 0;

        if (aliveCount === 0) {
          sim.done = true;
          sim.doneAt = time;
        }

        const focusBird = selectedId != null
          ? sim.birds.find((bird) => bird.id === selectedId)
          : bestBird;
        if (focusBird && time - activeValuesUpdateRef.current > 120) {
          activeValuesUpdateRef.current = time;
          setActiveValues({ ...(focusBird.activations || {}) });
        }

        if (time - hudUpdateRef.current > 110) {
          hudUpdateRef.current = time;
          setVisualStats({
            generation: sim.generation,
            aliveCount,
            total: sim.total,
            bestScore: sim.bestScore,
            frame: sim.frame,
            pipeSpeed: difficulty.pipeSpeed,
            pipeGap: difficulty.pipeGap
          });
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackground(ctx, size.width, size.height);
      drawPipes(ctx, sim.pipes, size.height);

      const deadBirds = sim.birds.filter((bird) => !bird.alive);
      const aliveBirds = sim.birds.filter((bird) => bird.alive);
      const bestAlive = aliveBirds.find((bird) => bird.id === sim.bestBirdId) || null;

      deadBirds.forEach((bird) => {
        const isSelectedDead = bird.id === selectedId;
        ctx.globalAlpha = isSelectedDead ? 0.32 : 0.18;
        drawBird(ctx, bird, false, isSelectedDead);
      });
      ctx.globalAlpha = 1;

      aliveBirds.forEach((bird) => {
        drawBird(ctx, bird, bird.id === bestAlive?.id, bird.id === selectedId);
      });

      if (showHud) {
        drawHud(
          ctx,
          {
            generation: sim.generation,
            aliveCount: aliveBirds.length,
            total: sim.total,
            bestScore: sim.bestScore,
            frame: sim.frame,
            progress: progressRef.current,
            pipeSpeed: sim.difficulty?.pipeSpeed ?? FLAPPY.basePipeSpeed,
            pipeGap: sim.difficulty?.pipeGap ?? FLAPPY.basePipeGap
          },
          isArabic,
          t,
          size.height
        );
      }

      if (sim.done) {
        ctx.fillStyle = "rgba(2,6,23,0.62)";
        roundRectPath(ctx, size.width / 2 - 170, size.height / 2 - 44, 340, 88, 12);
        ctx.fill();

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 16px Cairo, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          isRunning
            ? t("انتهى عرض هذا الجيل، جارٍ تحميل الجيل التالي...", "Generation finished, loading next one...")
            : t("كل الطيور خرجت، شغّل التطور لجيل جديد.", "All birds are out, run evolution for a new generation."),
          size.width / 2,
          size.height / 2 + 6
        );

        if (sim.pendingData && time - sim.doneAt > 520) {
          buildSimulation(sim.pendingData);
        } else if (!sim.pendingData && isRunning && time - sim.doneAt > 1200) {
          buildSimulation({
            ...latestDataRef.current,
            token: `${latestDataRef.current.token}:replay:${Math.floor(time)}`
          });
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isArabic, isRunning, selectedId, showHud, size.height, size.width, t]);

  const handleCanvasClick = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const sim = simRef.current;
    if (!rect || !sim) return;

    const y = event.clientY - rect.top;
    let best = null;
    let minDist = Infinity;

    sim.birds.forEach((bird) => {
      if (!bird.alive) return;
      const d = Math.abs(bird.y - y);
      if (d < minDist) {
        minDist = d;
        best = bird;
      }
    });

    if (best && minDist < 22) {
      onSelectGenome?.({ id: best.id });
    }
  };

  const selectedFitness = population.find((item) => item.id === selectedId)?.fitness ?? 0;

  return (
    <div
      className="view-environment view-enter"
      style={showSidePanels ? undefined : { gridTemplateColumns: "minmax(0, 1fr)" }}
    >
      <div className="neat-canvas-wrap flappy-wrap" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          className="neat-canvas"
          onClick={handleCanvasClick}
          role="img"
          aria-label={t("محاكاة مجتمع Flappy Bird", "Flappy Bird population simulation")}
        />
      </div>

      {showSidePanels && (
        <aside className="side-panel">
          <section className="panel-card">
            <h4>{t("حالة الجولة", "Round Status")}</h4>
            <div className="env-stat">
              <span>{t("الجيل", "Generation")}</span>
              <strong>{visualStats.generation}</strong>
            </div>
            <div className="env-stat">
              <span>{t("الأحياء", "Alive")}</span>
              <strong>{visualStats.aliveCount}/{visualStats.total}</strong>
            </div>
            <div className="env-stat">
              <span>{t("أفضل نتيجة", "Best Score")}</span>
              <strong>{fmt(visualStats.bestScore, 0)}</strong>
            </div>
            <div className="env-stat">
              <span>{t("أفضل لياقة (التقييم)", "Best Fitness (Eval)")}</span>
              <strong>{fmt(stats?.best, 1)}</strong>
            </div>
            <div className="env-stat">
              <span>{t("تقدم التقييم", "Eval Progress")}</span>
              <strong>{Math.round(clamp(Number(progress || 0), 0, 1) * 100)}%</strong>
            </div>
            <div className="fitness-bar" style={{ marginTop: "0.12rem" }}>
              <span style={{ width: `${Math.round(clamp(Number(progress || 0), 0, 1) * 100)}%`, background: "#38bdf8" }} />
            </div>
            <div className="env-stat">
              <span>{t("سرعة الأنابيب", "Pipe Speed")}</span>
              <strong>{fmt(visualStats.pipeSpeed, 2)}</strong>
            </div>
            <div className="env-stat">
              <span>{t("حجم الفتحة", "Gap Size")}</span>
              <strong>{Math.round(visualStats.pipeGap)}px</strong>
            </div>
            <div className="env-stat">
              <span>{t("متوسط اللياقة", "Average Fitness")}</span>
              <strong>{fmt(stats?.avg, 1)}</strong>
            </div>
            <div className="env-stat">
              <span>{t("الأنواع", "Species")}</span>
              <strong>{stats?.species ?? 0}</strong>
            </div>
            <div className="env-stat">
              <span>{t("تعقيد الشبكة", "Network Complexity")}</span>
              <strong>{(stats?.nodes ?? 0)}/{(stats?.conns ?? 0)}</strong>
            </div>
            <div className="panel-actions" style={{ marginTop: "0.6rem" }}>
              <button
                type="button"
                className={`mini-btn ${isPlaying ? "running" : ""}`.trim()}
                onClick={() => setIsPlaying((value) => !value)}
              >
                {isPlaying ? t("إيقاف العرض", "Pause Visual") : t("تشغيل العرض", "Play Visual")}
              </button>
              <button type="button" className="mini-btn" onClick={() => buildSimulation()}>
                {t("إعادة الجولة", "Replay Round")}
              </button>
            </div>
          </section>

          <section className="panel-card">
            <h4>{t("الجينوم المحدد", "Selected Genome")}</h4>
            <div className="env-stat">
              <span>ID</span>
              <strong>#{selectedId ?? "--"}</strong>
            </div>
            <div className="env-stat">
              <span>{t("اللياقة", "Fitness")}</span>
              <strong>{fmt(selectedFitness, 2)}</strong>
            </div>
            <div className="env-stat">
              <span>{t("العقد/الوصلات", "Nodes/Conns")}</span>
              <strong>
                {focusGenome?.nodes?.length ?? 0}/
                {(focusGenome?.connections || []).filter((conn) => conn.enabled !== false).length}
              </strong>
            </div>
            {focusOutputs.map((output) => (
              <div key={output.id} className="env-stat">
                <span>{t("مخرج", "Output")} {output.id}</span>
                <strong>{fmt(output.value, 3)}</strong>
              </div>
            ))}
            <p className="network-caption">
              {t(
                "انقر على طائر حي لاختياره ومراقبة تفعيل شبكته مباشرة.",
                "Click a live bird to inspect its active network."
              )}
            </p>
          </section>

          <section className="panel-card">
            <h4>{t("الشبكة النشطة", "Active Network")}</h4>
            <div className="network-card mini">
              <NetworkCanvas
                genome={focusGenome}
                activeValues={activeValues}
                minHeight={220}
              />
            </div>
            <p className="network-caption">
              {t(
                "وميض العقد والوصلات يوضح كيف تتخذ الشبكة قرار القفز أثناء اللعب.",
                "Node glow reflects live activations while deciding when to jump."
              )}
            </p>
          </section>

          {showExplanations && (
            <section className="panel-card info-card">
              <h4>{t("ماذا يحدث الآن؟", "What Is Happening?")}</h4>
              <div className="env-stat"><span>{t("أزرق", "Blue")}</span><strong>{t("طيور حية", "Alive birds")}</strong></div>
              <div className="env-stat"><span>{t("أخضر", "Green")}</span><strong>{t("أفضل طائر حالي", "Current best bird")}</strong></div>
              <div className="env-stat"><span>{t("أحمر شفاف", "Faded Red")}</span><strong>{t("طيور فشلت في هذه الجولة", "Birds that failed this round")}</strong></div>
              <p className="network-caption">
                {t(
                  "قد ينجح جيل ثم يتراجع الجيل التالي قليلًا. هذا طبيعي، والمهم هو اتجاه التحسن عبر عدة أجيال لا نتيجة جيل واحد.",
                  "A generation can outperform the next one temporarily. Focus on multi-generation trend, not one snapshot."
                )}
              </p>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
