import React from "react";
import { Copy, HelpCircle, Languages, Moon, Sun } from "lucide-react";
import { useUISettings } from "../../context/UISettingsContext.jsx";

export default function TopBar({ title }) {
  const { language, toggleLanguage, theme, toggleTheme, t } = useUISettings();
  const isArabic = language === "ar";

  return (
    <header className="topbar">
      <div className="flex items-center gap-4">
        <h1 className="topbar-title">{title || "Math Agent"}</h1>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" title={t("نسخ", "Copy")}>
          <Copy size={16} />
        </button>
        <button className="icon-button" title={t("مساعدة", "Help")}>
          <HelpCircle size={16} />
        </button>

        <button
          className="topbar-switch"
          title={t("تبديل لغة الواجهة", "Toggle interface language")}
          onClick={toggleLanguage}
        >
          <Languages size={16} />
          <span>{isArabic ? "العربية" : "English"}</span>
        </button>

        <button
          className="topbar-switch"
          title={t("تبديل الثيم", "Toggle theme")}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === "dark" ? t("ليلي", "Dark") : t("مضيء", "Light")}</span>
        </button>

        <div className="topbar-chip">{language.toUpperCase()}</div>
      </div>
    </header>
  );
}
