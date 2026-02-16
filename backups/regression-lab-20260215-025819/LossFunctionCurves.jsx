import { useMemo } from "react";
import SafePlot from "../../../components/SafePlot";

const LOSS_COLORS = {
  bce: "#38bdf8",
  focal: "#f59e0b",
  mae: "#34d399",
  mse: "#818cf8",
  hinge: "#f97316",
  log_cosh: "#e879f9"
};

const LOSS_NAMES = {
  bce: "BCE",
  focal: "Focal",
  mae: "MAE",
  mse: "MSE",
  hinge: "Hinge",
  log_cosh: "Log-Cosh"
};

function safeLog(value) {
  return Math.log(Math.max(1e-7, value));
}

function computeCurveValue(loss, p) {
  const probability = Math.max(1e-6, Math.min(1 - 1e-6, p));
  const error = 1 - probability; // y_true = 1
  const logit = Math.log(probability / (1 - probability));

  if (loss === "bce") return -safeLog(probability);
  if (loss === "focal") return -Math.pow(1 - probability, 2) * safeLog(probability);
  if (loss === "mae") return Math.abs(error);
  if (loss === "mse") return error * error;
  if (loss === "hinge") return Math.max(0, 1 - logit);
  if (loss === "log_cosh") return Math.log(Math.cosh(error));
  return 0;
}

export default function LossFunctionCurves({ enabled, selectedLoss = "bce" }) {
  const traces = useMemo(() => {
    if (!enabled) return [];
    const xs = [];
    for (let i = 0; i <= 180; i += 1) {
      xs.push(0.001 + (0.998 * i) / 180);
    }
    const losses = ["bce", "focal", "mae", "mse", "hinge", "log_cosh"];
    return losses.map((loss) => ({
      type: "scatter",
      mode: "lines",
      name: LOSS_NAMES[loss],
      x: xs,
      y: xs.map((p) => computeCurveValue(loss, p)),
      line: {
        color: LOSS_COLORS[loss],
        width: selectedLoss === loss ? 2.9 : 1.7
      },
      opacity: selectedLoss === loss ? 1 : 0.42
    }));
  }, [enabled, selectedLoss]);

  if (!enabled) {
    return (
      <section className="reglab-panel reglab-loss-fn disabled">
        <div className="reglab-loss-fn-head">
          <strong>Loss Function Curves</strong>
        </div>
        <p>Available in Logistic mode only.</p>
      </section>
    );
  }

  return (
    <section className="reglab-panel reglab-loss-fn">
      <div className="reglab-loss-fn-head">
        <strong>Loss Function Curves</strong>
        <span>y_true = 1 | highlighted: {LOSS_NAMES[selectedLoss] || selectedLoss}</span>
      </div>
      <div className="reglab-loss-fn-plot">
        <SafePlot
          data={traces}
          layout={{
            uirevision: "reglab-loss-curves-ui",
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            margin: { l: 36, r: 16, t: 16, b: 30 },
            xaxis: {
              title: "prediction probability (p)",
              color: "#a7b9e2",
              gridcolor: "rgba(95,114,153,0.25)",
              zerolinecolor: "rgba(95,114,153,0.25)",
              range: [0, 1]
            },
            yaxis: {
              title: "loss",
              color: "#a7b9e2",
              gridcolor: "rgba(95,114,153,0.25)",
              zerolinecolor: "rgba(95,114,153,0.25)"
            },
            showlegend: true,
            legend: {
              orientation: "h",
              x: 0,
              y: 1.2,
              font: { color: "#dbe8ff", size: 10 },
              bgcolor: "rgba(0,0,0,0)"
            }
          }}
          config={{ responsive: true, displaylogo: false }}
        />
      </div>
    </section>
  );
}

