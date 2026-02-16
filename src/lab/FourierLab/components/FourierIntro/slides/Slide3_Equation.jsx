import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

const PARTS = [
  { key: "f", ar: "f(t): الإشارة الأصلية (Original Signal)", en: "f(t): the original signal" },
  { key: "a0", ar: "A_0: المركبة الثابتة (DC Component)", en: "A_0: DC component" },
  { key: "an", ar: "A_n, B_n: معاملات قوة كل تردد (Amplitude Coefficients)", en: "A_n, B_n: amplitude coefficients" },
  { key: "trig", ar: "sin/cos: موجات جيبية أساسية (Basis Waves)", en: "sin/cos: basis waves" },
  { key: "sum", ar: "\u03A3: نجمع كل المكونات للحصول على الشكل النهائي", en: "\u03A3: sum all components" }
];

export default function Slide3_Equation({ t, isArabic }) {
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setReveal((prev) => {
        if (prev >= PARTS.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="fourier-intro-slide-card">
      <h2>{t("معادلة فورييه (Fourier Series)", "Fourier Series Equation")}</h2>

      <div className="fourier-intro-equation-box">
        <BlockMath
          math={String.raw`f(t)=A_0+\sum_{n=1}^{\infty}\left[A_n\cos(2\pi nt)+B_n\sin(2\pi nt)\right]`}
          throwOnError={false}
        />
      </div>

      <div className="fourier-intro-parts">
        {PARTS.map((part, index) => (
          <div key={part.key} className={`fourier-intro-part ${index < reveal ? "active" : ""}`}>
            {isArabic ? part.ar : part.en}
          </div>
        ))}
      </div>
    </section>
  );
}
