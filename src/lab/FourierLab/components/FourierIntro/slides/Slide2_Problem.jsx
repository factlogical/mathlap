export default function Slide2_Problem({ t }) {
  return (
    <section className="fourier-intro-slide-card">
      <h2>{t("مشكلة انتقال الحرارة (Heat Transfer)", "The Heat Transfer Problem")}</h2>

      <p>
        {t(
          "بدأ فورييه بدراسة كيف تنتقل الحرارة داخل قضيب معدني مع الزمن.",
          "Fourier started by studying how heat propagates inside a metal bar over time."
        )}
      </p>

      <div className="fourier-intro-heat-rod" aria-hidden="true" />

      <p>
        {t(
          "اكتشف أن أي توزيع حراري يمكن تحليله كمجموع موجات جيبية (Sine/Cosine Waves).",
          "He discovered that any heat distribution can be decomposed into sine/cosine waves."
        )}
      </p>

      <p className="fourier-intro-note">
        {t("هذه الفكرة أصبحت أساساً للمعالجة الرقمية الحديثة.", "This idea became a foundation for modern digital processing.")}
      </p>
    </section>
  );
}
