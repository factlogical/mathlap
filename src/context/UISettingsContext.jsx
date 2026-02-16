import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const UISettingsContext = createContext(null);

const LANG_KEY = "math_agent_ui_lang";
const THEME_KEY = "math_agent_ui_theme";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch {
    // ignore
  }
  return "ar";
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore
  }
  return "dark";
}

export function UISettingsProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-lang", language);
    html.setAttribute("data-theme", theme);
    html.setAttribute("lang", language);
    html.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
  }, [language, theme]);

  const value = useMemo(() => {
    const isArabic = language === "ar";
    const t = (ar, en) => (isArabic ? ar : en);
    return {
      language,
      setLanguage,
      isArabic,
      theme,
      setTheme,
      t,
      toggleLanguage: () => setLanguage((prev) => (prev === "ar" ? "en" : "ar")),
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))
    };
  }, [language, theme]);

  return <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>;
}

export function useUISettings() {
  const ctx = useContext(UISettingsContext);
  if (!ctx) {
    throw new Error("useUISettings must be used within UISettingsProvider");
  }
  return ctx;
}

