import { Activity, Image, Music2, Signal, Wifi } from "lucide-react";

const APPS = [
  { icon: Music2, ar: "MP3: حذف ترددات لا تُسمع بسهولة", en: "MP3: removes less audible frequencies" },
  { icon: Image, ar: "JPEG: ضغط الصور عبر تحويلات ترددية", en: "JPEG: compresses images using frequency transforms" },
  { icon: Wifi, ar: "WiFi: إرسال البيانات كمركبات ترددية", en: "WiFi: transmits data with frequency components" },
  { icon: Activity, ar: "MRI: إعادة بناء صور طبية عالية الدقة", en: "MRI: reconstructs high-detail medical images" },
  { icon: Signal, ar: "الصوت: كل نغمة = ترددات متراكبة", en: "Audio: each note is a superposition of frequencies" }
];

export default function Slide5_RealWorld({ t, isArabic }) {
  return (
    <section className="fourier-intro-slide-card">
      <h2>{t("التطبيقات الواقعية (Real-World Applications)", "Real-World Applications")}</h2>

      <div className="fourier-intro-app-grid">
        {APPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.ar} className="fourier-intro-app-item" style={{ animationDelay: `${index * 120}ms` }}>
              <Icon size={18} />
              <span>{isArabic ? item.ar : item.en}</span>
            </div>
          );
        })}
      </div>

      <p className="fourier-intro-note">
        {t(
          "فكرة طوّرها فورييه للحرارة أصبحت اليوم في الصوت والصور والاتصالات.",
          "A heat equation insight now powers modern audio, imaging, and communication."
        )}
      </p>
    </section>
  );
}
