export default function Slide1_Portrait({ t }) {
  return (
    <section className="fourier-intro-slide-card fourier-intro-slide-portrait">
      <div className="fourier-intro-portrait-ring">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Joseph_Fourier.jpg/512px-Joseph_Fourier.jpg.webp"
          alt="Joseph Fourier"
          loading="eager"
        />
      </div>

      <h2>{t("جان-بابتيست جوزيف فورييه", "Jean-Baptiste Joseph Fourier")}</h2>
      <p className="fourier-intro-sub">1768 - 1830</p>

      <p>
        {t(
          "رياضي فرنسي غيّر فهمنا للإشارات والحرارة بسؤال بسيط:",
          "A French mathematician who transformed our understanding of signals and heat with one question:"
        )}
      </p>

      <blockquote>
        {t("هل يمكن تمثيل أي شكل كمجموع من الموجات؟", "Can any shape be represented as a sum of waves?")}
      </blockquote>
    </section>
  );
}
