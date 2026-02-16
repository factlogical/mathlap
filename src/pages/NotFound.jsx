import { AlertCircle } from "lucide-react";
import { useUISettings } from "../context/UISettingsContext.jsx";

export default function NotFound({ onGoHome }) {
  const { t } = useUISettings();

  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="max-w-md text-center rounded-2xl border border-white/10 bg-slate-950/60 p-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">
          {t("404 - الصفحة غير موجودة", "404 - Page Not Found")}
        </h2>
        <p className="text-slate-400 mb-6">
          {t("المسار المطلوب غير متاح حالياً.", "The requested view is not available right now.")}
        </p>
        <button
          type="button"
          onClick={onGoHome}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
        >
          {t("العودة للرئيسية", "Back Home")}
        </button>
      </div>
    </div>
  );
}
