import { useEffect, useMemo, useRef, useState } from "react";
import { useUISettings } from "../../../context/UISettingsContext.jsx";
import FitnessBar from "./shared/FitnessBar.jsx";

function fmt(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(digits);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function groupBySpecies(population) {
  const groups = new Map();
  population.forEach((genome) => {
    const key = Number.isFinite(genome.speciesId) ? genome.speciesId : -1;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(genome);
  });
  return groups;
}

function drawBlob(ctx, cx, cy, radius, color, phase) {
  ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) {
    const t = (i / 24) * Math.PI * 2;
    const wobble = 1 + Math.sin(t * 3 + phase) * 0.06;
    const x = cx + Math.cos(t) * radius * wobble;
    const y = cy + Math.sin(t) * radius * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawMiniNetwork(ctx, cx, cy, scale = 1) {
  const inputCount = 5;
  const outputCount = 2;
  const iX = cx - 18 * scale;
  const oX = cx + 18 * scale;

  const inputs = Array.from({ length: inputCount }, (_, i) => ({
    x: iX,
    y: cy - 16 * scale + i * 8 * scale
  }));

  const outputs = Array.from({ length: outputCount }, (_, i) => ({
    x: oX,
    y: cy - 6 * scale + i * 12 * scale
  }));

  ctx.strokeStyle = "rgba(226,232,240,0.72)";
  ctx.lineWidth = 1;
  inputs.forEach((input, i) => {
    outputs.forEach((output, j) => {
      if ((i + j) % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(input.x, input.y);
        ctx.lineTo(output.x, output.y);
        ctx.stroke();
      }
    });
  });

  [...inputs, ...outputs].forEach((node) => {
    ctx.fillStyle = "rgba(248,250,252,0.95)";
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
  });
}

function SpeciesMap({ speciesGroups, onPickSpecies, t }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const entries = useMemo(
    () => [...speciesGroups.entries()].sort((a, b) => b[1].length - a[1].length),
    [speciesGroups]
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#12161f";
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.strokeStyle = "rgba(226,232,240,0.24)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const rows = 2;
    const cols = 3;
    for (let c = 1; c < cols; c += 1) {
      const x = (size.width / cols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r += 1) {
      const y = (size.height / rows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    entries.slice(0, 6).forEach(([speciesId, members], index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellW = size.width / cols;
      const cellH = size.height / rows;
      const cx = cellW * col + cellW * 0.5;
      const cy = cellH * row + cellH * 0.5;

      const radius = clamp(36 + members.length * 0.4, 34, 62);
      drawBlob(ctx, cx, cy, radius, "rgba(226,232,240,0.86)", index * 0.7);
      drawMiniNetwork(ctx, cx, cy, radius / 48);

      ctx.fillStyle = "rgba(226,232,240,0.84)";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${t("نوع", "Species")} ${speciesId} (${members.length})`, cx, cy + radius + 16);
    });
  }, [entries, size.height, size.width, t]);

  const handleClick = (event) => {
    if (!entries.length) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cols = 3;
    const col = Math.floor((x / rect.width) * cols);
    const row = Math.floor((y / rect.height) * 2);
    const index = row * cols + col;

    const entry = entries[index];
    if (!entry) return;
    const [speciesId, members] = entry;
    onPickSpecies?.(speciesId, members);
  };

  return (
    <div ref={wrapRef} className="species-map-wrap">
      <canvas ref={canvasRef} className="species-map-canvas" onClick={handleClick} />
    </div>
  );
}

function TopCard({ genome, rank, maxFit, onSelect, onViewDNA, onViewPlay, t }) {
  const ratio = clamp(Number(genome.fitness || 0) / maxFit, 0, 1);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <article className={`top-card rank-${rank}`}>
      <div className="card-medal">{medals[rank - 1]}</div>
      <div className="card-bird" style={{ background: `hsl(${ratio * 120}, 70%, 55%)` }} />

      <div className="card-fitness">{fmt(genome.fitness, 1)}</div>
      <div className="card-id">#{genome.id}</div>
      <div className="card-species">{t("نوع", "Species")} {genome.speciesId ?? "--"}</div>

      <div className="fitness-bar" style={{ marginTop: "0.45rem" }}>
        <span style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className="card-details">
        <span>{t("عقد", "Nodes")}: {genome.nodesCount ?? 0}</span>
        <span>{t("وصلات", "Conns")}: {genome.connsCount ?? 0}</span>
      </div>

      <div className="panel-actions" style={{ marginTop: "0.45rem" }}>
        <button type="button" className="mini-btn" onClick={() => onSelect?.(genome)}>
          {t("تحديد", "Select")}
        </button>
        <button type="button" className="mini-btn" onClick={() => onViewDNA?.(genome)}>
          {t("DNA", "DNA")}
        </button>
        <button type="button" className="mini-btn" onClick={() => onViewPlay?.(genome)}>
          {t("تشغيل", "Play")}
        </button>
      </div>
    </article>
  );
}

function MiniCard({ genome, maxFit, selected, onClick }) {
  const ratio = clamp(Number(genome.fitness || 0) / maxFit, 0, 1);
  return (
    <button
      type="button"
      className={`mini-card ${selected ? "active" : ""}`.trim()}
      onClick={onClick}
      style={{ borderColor: `hsla(${ratio * 120}, 70%, 50%, 0.55)` }}
    >
      <span className="mini-bird" style={{ background: `hsl(${ratio * 120}, 70%, 55%)` }} />
      <strong className="mini-fitness">{fmt(genome.fitness, 0)}</strong>
      <span className="mini-id">#{genome.id}</span>
    </button>
  );
}

export default function PopulationView({
  population = [],
  generation = 0,
  selectedId,
  viewOptions,
  onSelect,
  onViewDNA,
  onViewPlay
}) {
  const { t } = useUISettings();

  const showSidePanels = viewOptions?.showSidePanels !== false;
  const showSpeciesMap = viewOptions?.showSpeciesMap !== false;
  const showExplanations = viewOptions?.showExplanations !== false;

  const sorted = useMemo(
    () => [...population].sort((a, b) => Number(b.fitness || 0) - Number(a.fitness || 0)),
    [population]
  );

  const speciesGroups = useMemo(() => groupBySpecies(population), [population]);
  const maxFit = Math.max(1, ...sorted.map((item) => Number(item.fitness || 0)));
  const avgFit = sorted.length
    ? sorted.reduce((sum, item) => sum + Number(item.fitness || 0), 0) / sorted.length
    : 0;

  const selected = sorted.find((item) => item.id === selectedId) || sorted[0] || null;
  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const speciesSummary = useMemo(
    () => [...speciesGroups.entries()]
      .map(([speciesId, members]) => ({ speciesId, count: members.length }))
      .sort((a, b) => b.count - a.count),
    [speciesGroups]
  );

  const handlePickSpecies = (_speciesId, members) => {
    const best = [...members].sort((a, b) => Number(b.fitness || 0) - Number(a.fitness || 0))[0];
    if (best) onSelect?.(best);
  };

  return (
    <div
      className="view-population view-enter"
      style={showSidePanels ? undefined : { gridTemplateColumns: "minmax(0, 1fr)" }}
    >
      <div className="population-cards-main">
        <div className="pop-header">
          <h3>{t("🧬 المجتمع", "🧬 Population")} - {t("جيل", "Gen")} {generation}</h3>
          <div className="pop-stats">
            <span>{t("الأنواع", "Species")}: {speciesGroups.size}</span>
            <span>{t("الأفراد", "Individuals")}: {population.length}</span>
            <span>{t("أفضل لياقة", "Best")}: {fmt(sorted[0]?.fitness || 0, 1)}</span>
          </div>
        </div>

        {showSpeciesMap && (
          <SpeciesMap speciesGroups={speciesGroups} onPickSpecies={handlePickSpecies} t={t} />
        )}

        <div className="top-three">
          {topThree.map((genome, index) => (
            <TopCard
              key={genome.id}
              genome={genome}
              rank={index + 1}
              maxFit={maxFit}
              onSelect={onSelect}
              onViewDNA={onViewDNA}
              onViewPlay={onViewPlay}
              t={t}
            />
          ))}
        </div>

        <div className="pop-grid">
          {rest.map((genome) => (
            <MiniCard
              key={genome.id}
              genome={genome}
              maxFit={maxFit}
              selected={genome.id === selected?.id}
              onClick={() => onSelect?.(genome)}
            />
          ))}
        </div>
      </div>

      {showSidePanels && (
        <aside className="side-panel">
          <section className="panel-card">
            <h4>{t("تفاصيل المحدد", "Selected Details")}</h4>
            {selected ? (
              <>
                <div className="env-stat"><span>ID</span><strong>#{selected.id}</strong></div>
                <div className="env-stat"><span>{t("النوع", "Species")}</span><strong>{selected.speciesId ?? "--"}</strong></div>
                <div className="env-stat"><span>{t("اللياقة", "Fitness")}</span><strong>{fmt(selected.fitness, 2)}</strong></div>
                <div className="env-stat"><span>{t("العقد", "Nodes")}</span><strong>{selected.nodesCount ?? 0}</strong></div>
                <div className="env-stat"><span>{t("الوصلات", "Conns")}</span><strong>{selected.connsCount ?? 0}</strong></div>

                <div style={{ marginTop: "0.55rem" }}>
                  <FitnessBar value={selected.fitness} max={maxFit} />
                </div>

                <div className="panel-actions" style={{ marginTop: "0.6rem" }}>
                  <button type="button" className="mini-btn" onClick={() => onViewDNA?.(selected)}>
                    {t("عرض DNA", "View DNA")}
                  </button>
                  <button type="button" className="mini-btn" onClick={() => onViewPlay?.(selected)}>
                    {t("تشغيل في البيئة", "Run in Env")}
                  </button>
                </div>
              </>
            ) : (
              <p className="network-caption">{t("لا يوجد أفراد بعد", "No genomes yet")}</p>
            )}
          </section>

          <section className="panel-card">
            <h4>{t("أحجام الأنواع", "Species Sizes")}</h4>
            {speciesSummary.map((item) => (
              <div key={item.speciesId} className="env-stat">
                <span>{t("نوع", "Species")} {item.speciesId}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </section>

          {showExplanations && (
            <section className="panel-card info-card">
              <h4>{t("شرح اللياقة", "Fitness Meaning")}</h4>
              <p className="network-caption">
                {t(
                  "اللياقة تمثل جودة أداء الفرد داخل اللعبة. القيمة الأعلى تعني بقاء أطول + تجاوز أنابيب أكثر.",
                  "Fitness measures how well a genome plays. Higher means longer survival and more pipes passed."
                )}
              </p>
              <div className="env-stat">
                <span>{t("أفضل جينوم", "Best Genome")}</span>
                <strong>{fmt(sorted[0]?.fitness || 0, 1)}</strong>
              </div>
              <div className="env-stat">
                <span>{t("متوسط المجتمع", "Population Avg")}</span>
                <strong>{fmt(avgFit, 1)}</strong>
              </div>
              <p className="network-caption">
                {t(
                  "قد يهبط جيل واحد مؤقتًا، لكن المؤشر الصحيح هو اتجاه المنحنى عبر عدة أجيال.",
                  "One generation can dip temporarily. The meaningful signal is the multi-generation trend."
                )}
              </p>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
