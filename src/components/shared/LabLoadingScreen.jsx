import { Loader2 } from "lucide-react";
import { useUISettings } from "../../context/UISettingsContext.jsx";

export default function LabLoadingScreen({ name, hint }) {
  const { t } = useUISettings();
  const safeName = name || t("المختبر", "Lab");
  const safeHint = hint || t("جاري تجهيز التجربة التفاعلية...", "Preparing interactive experience...");

  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <div className="text-center text-slate-200">
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl border border-white/10 bg-slate-900/70 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
        <h3 className="text-base font-semibold mb-1">{safeName}</h3>
        <p className="text-sm text-slate-400">{safeHint}</p>
      </div>
    </div>
  );
}
