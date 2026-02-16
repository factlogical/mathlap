import { lazy, startTransition, Suspense, useEffect, useMemo, useState } from "react";
import { Brain, GitBranch, Sigma, TrendingUp } from "lucide-react";
import { useUISettings } from "../context/UISettingsContext.jsx";
import LabErrorBoundary from "../components/LabErrorBoundary.jsx";
import LabLoadingScreen from "../components/shared/LabLoadingScreen.jsx";
import "./ComputerScienceLab.css";

const ActivationLabRenderer = lazy(() => import("../lab/ActivationLab/ActivationLabRenderer"));
const RegressionLabRenderer = lazy(() => import("../lab/RegressionLab/RegressionLabRenderer"));
const NEATLabRenderer = lazy(() => import("../lab/NEATLab/NEATLabRenderer"));
const NeuralPlayground = lazy(() => import("./NeuralPlayground"));

const CS_LABS = [
  {
    id: "neural",
    label: { ar: "مختبر الشبكات العصبية", en: "Neural Playground" },
    description: {
      ar: "درّب شبكة عصبية وراقب حدود القرار بصريًا",
      en: "Train a neural network and inspect decision boundaries"
    },
    icon: Brain
  },
  {
    id: "activation",
    label: { ar: "مختبر التفعيل والخسارة", en: "Activation & Loss Lab" },
    description: {
      ar: "افهم دوال التفعيل والخسارة وسلوك التحسين",
      en: "Understand activations, losses, and optimization behavior"
    },
    icon: Sigma
  },
  {
    id: "regression",
    label: { ar: "مختبر الانحدار", en: "Regression Lab" },
    description: {
      ar: "نمذجة خطية ولوجستية تفاعلية مع عرض حي",
      en: "Interactive linear/logistic modeling with live feedback"
    },
    icon: TrendingUp
  },
  {
    id: "neat",
    label: { ar: "مختبر NEAT التطوري", en: "NEAT Evolution Lab" },
    description: {
      ar: "تطور بنية الشبكات والأوزان تلقائيًا عبر الأجيال",
      en: "Evolve topology and weights automatically across generations"
    },
    icon: GitBranch
  }
];

const VALID_LAB_IDS = new Set(CS_LABS.map((lab) => lab.id));

export default function ComputerScienceLab() {
  const { isArabic, t } = useUISettings();
  const [activeLab, setActiveLab] = useState(() => {
    const saved = localStorage.getItem("cs_lab_active");
    return VALID_LAB_IDS.has(saved) ? saved : "activation";
  });

  useEffect(() => {
    if (!VALID_LAB_IDS.has(activeLab)) {
      setActiveLab("activation");
      return;
    }
    localStorage.setItem("cs_lab_active", activeLab);
  }, [activeLab]);

  const loadingName = useMemo(() => {
    if (activeLab === "neural") return t("مختبر الشبكات العصبية", "Neural Playground");
    if (activeLab === "activation") return t("مختبر التفعيل والخسارة", "Activation & Loss Lab");
    if (activeLab === "regression") return t("مختبر الانحدار", "Regression Lab");
    if (activeLab === "neat") return t("مختبر NEAT التطوري", "NEAT Evolution Lab");
    return t("مختبر علوم الحاسوب", "Computer Science Lab");
  }, [activeLab, t]);

  return (
    <div className="cslab-shell" dir={isArabic ? "rtl" : "ltr"}>
      <header className="cslab-header">
        <div className="cslab-title-wrap">
          <h2>{t("مختبر علوم الحاسوب", "Computer Science Lab")}</h2>
          <p>
            {t(
              "مختبرات تفاعلية للشبكات العصبية، والتحسين، والانحدار، والتطور العصبي NEAT.",
              "Interactive labs for neural networks, optimization, regression, and NEAT neuroevolution."
            )}
          </p>
        </div>

        <div className="cslab-tabs">
          {CS_LABS.map((lab) => {
            const Icon = lab.icon;
            return (
              <button
                key={lab.id}
                type="button"
                className={`cslab-tab ${activeLab === lab.id ? "active" : ""}`}
                onClick={() =>
                  startTransition(() => {
                    setActiveLab(lab.id);
                  })
                }
              >
                <span className="cslab-tab-icon">
                  <Icon size={16} />
                </span>
                <span className="cslab-tab-text">
                  <strong>{isArabic ? lab.label.ar : lab.label.en}</strong>
                  <small>{isArabic ? lab.description.ar : lab.description.en}</small>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <section className="cslab-stage">
        <LabErrorBoundary resetKey={activeLab}>
          <Suspense
            fallback={
              <LabLoadingScreen
                name={loadingName}
                hint={t("جاري تهيئة التجربة التفاعلية...", "Preparing interactive experience...")}
              />
            }
          >
            {activeLab === "neural" && <NeuralPlayground />}
            {activeLab === "activation" && <ActivationLabRenderer />}
            {activeLab === "regression" && <RegressionLabRenderer />}
            {activeLab === "neat" && <NEATLabRenderer />}
          </Suspense>
        </LabErrorBoundary>
      </section>
    </div>
  );
}
