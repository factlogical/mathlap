export default function Slide6_Lab({ t, onNext }) {
  return (
    <section className="fourier-intro-slide-card fourier-intro-slide-final">
      <h2>{t("ماذا ستجد في المختبر؟", "What You Will Explore")}</h2>

      <div className="fourier-intro-final-list">
        <div>
          <strong>{t("🎨 الرسم والتحليل", "🎨 Draw and Analyze")}</strong>
          <p>{t("ارسم أي شكل وشاهد كيف يتحول إلى ترددات.", "Draw any shape and see it converted into frequencies.")}</p>
        </div>
        <div>
          <strong>{t("🎛️ بناء الموجة", "🎛️ Wave Builder")}</strong>
          <p>{t("ابنِ موجتك من مركبات جيبية وافهم تأثير كل مركب.", "Build your wave from sinusoidal components and inspect each contribution.")}</p>
        </div>
        <div>
          <strong>{t("🌍 التطبيقات", "🌍 Applications")}</strong>
          <p>{t("جرّب الصوت والضغط والنغمات ضمن سيناريوهات حقيقية.", "Try audio, compression, and notes in realistic scenarios.")}</p>
        </div>
      </div>

      <button type="button" className="fourier-intro-start-btn" onClick={onNext}>
        {t("🚀 ابدأ الاستكشاف", "🚀 Start Exploring")}
      </button>
    </section>
  );
}
