import { useState, useEffect } from 'react';

export type ThemeName = "snowlight" | "midnight";

export const THEME_KEY = "syncan_theme";

const THEMES: Record<ThemeName, ThemeVars> = {
  snowlight: {
    appBg: "#EEF2F7",
    appText: "#0F172A",
    sidebarBg: "#F7FAFF",
    sidebarHeaderBg: "linear-gradient(180deg, #EAF1FF 0%, #F7FAFF 100%)",
    itemHover: "rgba(15,23,42,0.06)",
    itemActive: "rgba(15,23,42,0.09)",
    surface: "#FFFFFF",
    surfaceBorder: "rgba(15,23,42,0.12)",
    logoutBg: "#e80b13",
    sidebarBorder: "rgba(15,23,42,0.10)",
    shadow: "0 18px 40px rgba(0,0,0,0.14)",
  },
  midnight: {
    appBg: "#1E2633",
    appText: "rgba(255,255,255,0.96)",
    sidebarBg: "#263246",
    sidebarHeaderBg: "linear-gradient(180deg, #1E2633 0%, #263246 100%)",
    itemHover: "rgba(255,255,255,0.06)",
    itemActive: "rgba(255,255,255,0.10)",
    surface: "#263246",
    surfaceBorder: "rgba(255,255,255,0.12)",
    logoutBg: "#e80b13",
    sidebarBorder: "rgba(255,255,255,0.09)",
    shadow: "0 18px 40px rgba(0,0,0,0.38)",
  },
};

interface ThemeVars {
  appBg: string;
  appText: string;
  sidebarBg: string;
  sidebarHeaderBg: string;
  itemHover: string;
  itemActive: string;
  surface: string;
  surfaceBorder: string;
  logoutBg: string;
  sidebarBorder: string;
  shadow: string;
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "snowlight";
    const saved = (localStorage.getItem(THEME_KEY) || "").toLowerCase();
    return saved === "midnight" ? "midnight" : "snowlight";
  });

  useEffect(() => {
    const handleThemeEvent = (e: CustomEvent) => {
      const raw = (e?.detail || "").toString().toLowerCase();
      if (raw === "snowlight" || raw === "midnight") {
        setTheme(raw as ThemeName);
      }
    };

    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === THEME_KEY) {
        const raw = (ev.newValue || "").toString().toLowerCase();
        if (raw === "snowlight" || raw === "midnight") {
          setTheme(raw as ThemeName);
        }
      }
    };

    window.addEventListener("syncan-theme", handleThemeEvent as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("syncan-theme", handleThemeEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const themeVars = THEMES[theme];

  return {
    theme,
    themeVars,
    setTheme: (newTheme: ThemeName) => {
      setTheme(newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
      window.dispatchEvent(new CustomEvent("syncan-theme", { detail: newTheme }));
    },
    toggleTheme: () => {
      const next: ThemeName = theme === "midnight" ? "snowlight" : "midnight";
      setTheme(next);
      localStorage.setItem(THEME_KEY, next);
      window.dispatchEvent(new CustomEvent("syncan-theme", { detail: next }));
    }
  };
}