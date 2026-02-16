import { useMemo } from "react";
import { useUISettings } from "../../../context/UISettingsContext.jsx";
import NetworkCanvas from "./shared/NetworkCanvas.jsx";
import FitnessBar from "./shared/FitnessBar.jsx";

function fmt(value, digits = 3) {
  if (!Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(digits);
}

export default function GenomeView({ genome }) {
  const { t } = useUISettings();

  const nodeStats = useMemo(() => {
    const stats = { input: 0, hidden: 0, output: 0 };
    (genome?.nodes || []).forEach((node) => {
      if (node.type === "input") stats.input += 1;
      else if (node.type === "output") stats.output += 1;
      else stats.hidden += 1;
    });
    return stats;
  }, [genome]);

  const enabledConnections = useMemo(
    () => (genome?.connections || []).filter((conn) => conn.enabled !== false),
    [genome]
  );

  const sortedConnections = useMemo(
    () => [...enabledConnections].sort((a, b) => Math.abs(Number(b.weight || 0)) - Math.abs(Number(a.weight || 0))),
    [enabledConnections]
  );

  const maxAbsWeight = useMemo(
    () => Math.max(1, ...enabledConnections.map((conn) => Math.abs(Number(conn.weight || 0)))),
    [enabledConnections]
  );

  if (!genome) {
    return (
      <div className="view-genome view-enter">
        <div className="canvas-empty">{t("اختر جينوم من تبويب المجتمع", "Select a genome from population")}</div>
      </div>
    );
  }

  return (
    <div className="view-genome view-enter">
      <div className="neat-canvas-wrap" style={{ padding: "0.85rem" }}>
        <div className="network-card">
          <NetworkCanvas genome={genome} minHeight={420} />
          <p className="network-caption">
            {t(
              "الأزرق وصلات موجبة، الأحمر وصلات سالبة. سماكة الخط تمثل قيمة الوزن.",
              "Blue: positive, red: negative. Edge thickness reflects weight magnitude."
            )}
          </p>
        </div>
      </div>

      <aside className="side-panel">
        <section className="panel-card">
          <h4>{t("ملخص الجينوم", "Genome Summary")}</h4>
          <div className="panel-meta">
            <div className="meta-kv">
              <strong>ID</strong>
              <span>#{genome.id}</span>
            </div>
            <div className="meta-kv">
              <strong>{t("اللياقة", "Fitness")}</strong>
              <span>{fmt(genome.fitness, 2)}</span>
            </div>
            <div className="meta-kv">
              <strong>{t("نوع", "Species")}</strong>
              <span>{genome.speciesId ?? "--"}</span>
            </div>
            <div className="meta-kv">
              <strong>{t("الوصلات المفعلة", "Active Conns")}</strong>
              <span>{enabledConnections.length}</span>
            </div>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <FitnessBar value={genome.fitness} max={Math.max(1, genome.fitness || 1)} />
          </div>
        </section>

        <section className="panel-card">
          <h4>{t("تركيب العقد", "Node Composition")}</h4>
          <div className="env-stat">
            <span>{t("مدخلات", "Inputs")}</span>
            <strong>{nodeStats.input}</strong>
          </div>
          <div className="env-stat">
            <span>{t("مخفية", "Hidden")}</span>
            <strong>{nodeStats.hidden}</strong>
          </div>
          <div className="env-stat">
            <span>{t("مخرجات", "Outputs")}</span>
            <strong>{nodeStats.output}</strong>
          </div>
        </section>

        <section className="panel-card">
          <h4>{t("أقوى الوصلات", "Strongest Connections")}</h4>
          <div className="connections-list">
            {sortedConnections.slice(0, 26).map((conn) => {
              const weight = Number(conn.weight || 0);
              const tone = weight >= 0 ? "positive" : "negative";
              const pct = Math.round((Math.abs(weight) / maxAbsWeight) * 100);
              return (
                <div key={`${conn.innovation}-${conn.fromNode}-${conn.toNode}`} className="conn-row">
                  <span>
                    {conn.fromNode} → {conn.toNode}
                  </span>
                  <span className={`conn-weight ${tone}`}>{fmt(weight, 3)}</span>
                  <span>{pct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}
