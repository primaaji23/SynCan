import React, { useState, useEffect } from "react";
import AppLayout from "../layouts/AppLayout";

type ThemeName = "snowlight" | "midnight";
const THEME_KEY = "syncan_theme";

function getThemeName(): ThemeName {
    try {
        const t = String(localStorage.getItem(THEME_KEY) || "snowlight").toLowerCase();
        return t === "midnight" ? "midnight" : "snowlight";
    } catch {
        return "snowlight";
    }
}

function useThemeVars(theme: ThemeName): React.CSSProperties {
    const dark = theme === "midnight";
    return {
        ["--text-1" as any]: dark ? "rgba(255,255,255,0.95)" : "#0F172A",
        ["--text-2" as any]: dark ? "rgba(255,255,255,0.78)" : "#475569",
        ["--text-3" as any]: dark ? "rgba(255,255,255,0.45)" : "#94A3B8",

        ["--card-bg" as any]: dark ? "#2B313D" : "#FFFFFF",
        ["--card-border" as any]: dark ? "rgba(255,255,255,0.10)" : "#E2E8F0",
        ["--card-shadow" as any]: dark
            ? "0 10px 26px rgba(0,0,0,0.35)"
            : "0 10px 30px rgba(0,0,0,0.08)",

        ["--blue" as any]: dark ? "#60A5FA" : "#3B82F6",
        ["--amber" as any]: "#F59E0B",
    };
}

export default function UnderConstruction() {
    const [theme, setTheme] = useState<ThemeName>(getThemeName());

    // Listen to theme changes from AppLayout
    useEffect(() => {
        const handleThemeChange = (e: CustomEvent) => {
            const newTheme = e.detail;
            if (newTheme === "snowlight" || newTheme === "midnight") {
                setTheme(newTheme);
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === THEME_KEY) {
                const newTheme = getThemeName();
                setTheme(newTheme);
            }
        };

        // Listen to custom event from AppLayout
        window.addEventListener("syncan-theme", handleThemeChange as EventListener);
        window.addEventListener("storage", handleStorageChange);

        // Also check for initial theme changes
        const interval = setInterval(() => {
            const currentTheme = getThemeName();
            if (currentTheme !== theme) {
                setTheme(currentTheme);
            }
        }, 100); // Check every 100ms

        return () => {
            window.removeEventListener("syncan-theme", handleThemeChange as EventListener);
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(interval);
        };
    }, [theme]);

    return (
        <AppLayout>
            <div
                style={{
                    ...useThemeVars(theme),
                    minHeight: "calc(100vh - 80px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                }}
            >
                <div
                    style={{
                        maxWidth: 960,
                        width: "100%",
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        borderRadius: 16,
                        boxShadow: "var(--card-shadow)",
                        padding: "48px 40px",
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr",
                        gap: 40,
                    }}
                >
                    {/* LEFT */}
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "var(--blue)",
                                letterSpacing: "0.08em",
                                marginBottom: 12,
                            }}
                        >
                            UNDER CONSTRUCTION
                        </div>

                        <h1
                            style={{
                                fontSize: 36,
                                lineHeight: 1.2,
                                fontWeight: 800,
                                color: "var(--text-1)",
                                marginBottom: 16,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Website sedang<br />kami bangun 🚧
                        </h1>

                        <p
                            style={{
                                fontSize: 15,
                                color: "var(--text-2)",
                                lineHeight: 1.7,
                                maxWidth: 420,
                                marginBottom: 28,
                            }}
                        >
                            Beberapa fitur masih dalam tahap pengembangan untuk meningkatkan
                            performa, keamanan, dan pengalaman pengguna.
                        </p>

                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 14px",
                                borderRadius: 8,
                                background:
                                    "color-mix(in srgb, var(--amber) 15%, transparent)",
                                color: "var(--amber)",
                                fontWeight: 700,
                                fontSize: 13,
                            }}
                        >
                            ⚙️ Maintenance in progress
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                aspectRatio: "4 / 3",
                                borderRadius: 14,
                                background:
                                    "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(245,158,11,0.15))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 64,
                            }}
                        >
                            🏗️
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}