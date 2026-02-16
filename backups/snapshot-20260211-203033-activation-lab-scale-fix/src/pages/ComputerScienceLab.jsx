import { useState } from "react";
import { Brain, Sigma } from "lucide-react";
import NeuralPlayground from "./NeuralPlayground";
import ActivationLabRenderer from "../lab/ActivationLab/ActivationLabRenderer";
import "./ComputerScienceLab.css";

const CS_LABS = [
  {
    id: "neural",
    label: "Neural Playground",
    description: "تدريب شبكة عصبية وتصور حدود القرار",
    icon: Brain
  },
  {
    id: "activation",
    label: "Activation & Loss Lab",
    description: "فهم دوال التفعيل والخسارة بشكل تفاعلي",
    icon: Sigma
  }
];

export default function ComputerScienceLab() {
  const [activeLab, setActiveLab] = useState("neural");

  return (
    <div className="cslab-shell">
      <header className="cslab-header">
        <div className="cslab-title-wrap">
          <h2>Computer Science Lab</h2>
          <p>مختبرات تفاعلية للشبكات العصبية، دوال التفعيل، ودوال الخسارة.</p>
        </div>
        <div className="cslab-tabs">
          {CS_LABS.map((lab) => {
            const Icon = lab.icon;
            return (
              <button
                key={lab.id}
                type="button"
                className={`cslab-tab ${activeLab === lab.id ? "active" : ""}`}
                onClick={() => setActiveLab(lab.id)}
              >
                <span className="cslab-tab-icon">
                  <Icon size={16} />
                </span>
                <span className="cslab-tab-text">
                  <strong>{lab.label}</strong>
                  <small>{lab.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <section className="cslab-stage">{activeLab === "neural" ? <NeuralPlayground /> : <ActivationLabRenderer />}</section>
    </div>
  );
}
