import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceLine,
  Cell
} from "recharts";
import { useUISettings } from "../../../context/UISettingsContext.jsx";

function fmt(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(digits);
}

const axisStyle = {
  fontSize: 11,
  fill: "#94a3b8"
};

const tooltipStyle = {
  background: "rgba(2,8,23,0.95)",
  border: "1px solid rgba(51,65,85,0.95)",
  borderRadius: 8,
  color: "#e2e8f0"
};

export default function DashboardView({ stats, history = [] }) {
  const { t } = useUISettings();

  const last = history[history.length - 1] || stats || {};
  const previous = history[history.length - 2] || null;

  const trendBest = previous ? Number(last.best || 0) - Number(previous.best || 0) : 0;
  const trendSpecies = previous ? Number(last.species || 0) - Number(previous.species || 0) : 0;

  const complexityData = history.map((item) => ({
    gen: item.gen,
    nodes: item.nodes,
    conns: item.conns
  }));

  const latestBars = [
    {
      name: t("أفضل", "Best"),
      value: Number(last.best || 0),
      color: "#22c55e"
    },
    {
      name: t("متوسط", "Avg"),
      value: Number(last.avg || 0),
      color: "#38bdf8"
    },
    {
      name: t("أسوأ", "Worst"),
      value: Number(last.worst || 0),
      color: "#f87171"
    }
  ];

  return (
    <div className="view-dashboard view-enter">
      <section className="dashboard-card">
        <h4>{t("منحنى اللياقة عبر الأجيال", "Fitness Across Generations")}</h4>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(100,116,139,0.2)" strokeDasharray="3 3" />
              <XAxis dataKey="gen" tick={axisStyle} />
              <YAxis tick={axisStyle} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="best" stroke="#22c55e" strokeWidth={2} dot={false} name={t("أفضل", "Best")} />
              <Line type="monotone" dataKey="avg" stroke="#38bdf8" strokeWidth={2} dot={false} name={t("متوسط", "Avg")} />
              <Line type="monotone" dataKey="worst" stroke="#f87171" strokeWidth={1.7} dot={false} name={t("أسوأ", "Worst")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card">
        <h4>{t("التنوع والتعقيد البنيوي", "Diversity & Structural Complexity")}</h4>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={complexityData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(100,116,139,0.2)" strokeDasharray="3 3" />
              <XAxis dataKey="gen" tick={axisStyle} />
              <YAxis tick={axisStyle} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="nodes" stroke="#a78bfa" fill="rgba(167,139,250,0.25)" name={t("العقد", "Nodes")} />
              <Area type="monotone" dataKey="conns" stroke="#f59e0b" fill="rgba(245,158,11,0.24)" name={t("الوصلات", "Connections")} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card">
        <h4>{t("ملخص آخر جيل", "Latest Generation Snapshot")}</h4>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latestBars} margin={{ top: 18, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(100,116,139,0.2)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={axisStyle} />
              <YAxis tick={axisStyle} width={38} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={Number(last.avg || 0)} stroke="#38bdf8" strokeDasharray="4 4" />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {latestBars.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card">
        <h4>{t("مؤشرات حية", "Live Indicators")}</h4>
        <div className="panel-card" style={{ marginTop: 4 }}>
          <div className="env-stat">
            <span>{t("الجيل", "Generation")}</span>
            <strong>{last.gen ?? 0}</strong>
          </div>
          <div className="env-stat">
            <span>{t("أفضل لياقة", "Best Fitness")}</span>
            <strong>{fmt(last.best)}</strong>
          </div>
          <div className="env-stat">
            <span>{t("متوسط اللياقة", "Average Fitness")}</span>
            <strong>{fmt(last.avg)}</strong>
          </div>
          <div className="env-stat">
            <span>{t("عدد الأنواع", "Species Count")}</span>
            <strong>{last.species ?? 0}</strong>
          </div>
          <div className="env-stat">
            <span>{t("تغير الأفضل عن الجيل السابق", "Best Delta vs Previous")}</span>
            <strong style={{ color: trendBest >= 0 ? "#4ade80" : "#f87171" }}>
              {trendBest >= 0 ? "+" : ""}
              {fmt(trendBest, 3)}
            </strong>
          </div>
          <div className="env-stat">
            <span>{t("تغير عدد الأنواع", "Species Delta")}</span>
            <strong style={{ color: trendSpecies >= 0 ? "#4ade80" : "#fbbf24" }}>
              {trendSpecies >= 0 ? "+" : ""}
              {trendSpecies}
            </strong>
          </div>
        </div>

        <p className="network-caption" style={{ marginTop: "0.6rem" }}>
          {t(
            "راقب استقرار المنحنى: صعود أفضل لياقة مع بقاء عدد الأنواع متنوعًا مؤشر صحي للتطور.",
            "Healthy evolution usually means best fitness rises while species diversity does not collapse."
          )}
        </p>
      </section>
    </div>
  );
}

