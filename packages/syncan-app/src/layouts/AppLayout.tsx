import React, { ReactNode, useEffect, useMemo, useState, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import PortalTooltip from "../components/PortalTooltip";

type AppLayoutProps = {
  children: ReactNode;
  onLogout?: () => void;
  brandTitle?: string;
};

type NavItem = {
  key: string;
  label: string;
  to?: string;
  icon: React.ReactNode;
  children?: NavItem[];
};

type ThemeName = "snowlight" | "midnight";

type ThemeVars = {
  appBg: string;
  appText: string;

  sidebarBg: string;
  sidebarHeaderBg: string;

  itemHover: string;
  itemActive: string;

  surface: string; // dropdown bg
  surfaceBorder: string;

  logoutBg: string;
  sidebarBorder: string;
  shadow: string;
};

const THEME_KEY = "syncan_theme";

const THEMES: Record<ThemeName, { label: string; vars: ThemeVars }> = {
  snowlight: {
    label: "Snowlight",
    vars: {
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
  },

  // Midnight: lebih biru (blue-gray)
  midnight: {
    label: "Midnight",
    vars: {
      appBg: "#1E2633", // 👈 lebih biru (sebelumnya abu gelap)
      appText: "rgba(255,255,255,0.96)",

      sidebarBg: "#263246", // 👈 blue-gray sidebar
      sidebarHeaderBg: "linear-gradient(180deg, #1E2633 0%, #263246 100%)",

      itemHover: "rgba(255,255,255,0.06)",
      itemActive: "rgba(255,255,255,0.10)",

      surface: "#263246",
      surfaceBorder: "rgba(255,255,255,0.12)",

      logoutBg: "#e80b13",
      sidebarBorder: "rgba(255,255,255,0.09)",
      shadow: "0 18px 40px rgba(0,0,0,0.38)",
    },
  },
};

// Hook to detect mobile screen
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };
    onResize(); // initial check
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function AppLayout({
  children,
  onLogout,
  brandTitle = "SynCan",
}: AppLayoutProps) {
  const navigate = useNavigate();
  const [openMaster, setOpenMaster] = useState(false);

  const isMobile = useIsMobile(768);
  const isFlowRoute = location.pathname.startsWith("/flow");

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("syncan_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  // Periodic account status check
  useEffect(() => {
    const checkAccountStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/auth/check-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          // Token invalid atau error
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        const data = await response.json();

        // Jika account disabled, force logout
        if (!data.isActive) {
          alert(`Your account has been disabled.\nReason: ${data.disabledReason || 'No reason provided'}`);
          localStorage.clear();
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Status check failed:', error);
      }
    };

    // Check setiap 5 menit
    const interval = setInterval(checkAccountStatus, 5 * 60 * 1000);

    // Check sekali saat component mount
    checkAccountStatus();

    return () => clearInterval(interval);
  }, []);

  // Theme state
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "snowlight";
    const saved =
      (localStorage.getItem("syncan_theme") || "").toLowerCase();
    return saved === "midnight" ? "midnight" : "snowlight";
  });

  useEffect(() => {
    const onThemeEvent = (e: any) => {
      const raw = (e?.detail || "").toString().toLowerCase();
      if (raw === "snowlight" || raw === "midnight") {
        setTheme(raw as ThemeName);
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "syncan_theme") {
        const raw = (ev.newValue || "").toString().toLowerCase();
        if (raw === "snowlight" || raw === "midnight") {
          setTheme(raw as ThemeName);
        }
      }
    };

    window.addEventListener("syncan-theme", onThemeEvent as any);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("syncan-theme", onThemeEvent as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(THEME_KEY) || "").toLowerCase() as ThemeName;
      if (saved && THEMES[saved]) setTheme(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // persist + broadcast theme change (biar chart/page re-render tanpa reload)
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }

    // optional: kalau ada komponen lain yang mau baca dari DOM
    try {
      document.documentElement.setAttribute("data-syncan-theme", theme);
    } catch {
      // ignore
    }

    // event untuk Dashboard/Inventory/Assets (Recharts, dll)
    try {
      window.dispatchEvent(new CustomEvent("syncan-theme", { detail: theme }));
    } catch {
      // ignore
    }
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem("syncan_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const items: NavItem[] = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", to: "/dashboard", icon: <IconMonitor /> },
      // {
      //   key: "master",
      //   label: "Master",
      //   icon: <IconGrid />,
      //   children: [
      //     { key: "supplier", label: "Supplier", to: "/supplier", icon: <IconGrid /> },
      //     { key: "branch", label: "Branch", to: "/branch", icon: <IconGrid /> },
      //   ],
      // },
      { key: "inventory", label: "Inventory", to: "/inventory", icon: <IconBox /> },
      { key: "assets", label: "Assets", to: "/assets", icon: <IconLayers /> },
      { key: "flow", label: "Flow Network", to: "/flow", icon: <IconShare /> },
      { key: "toner", label: "Toner", to: "/toner", icon: <IconPrinter /> },
      { key: "trash", label: "Trash", to: "/trash", icon: <IconTrash /> },
      { key: "report", label: "Report", to: "/report", icon: <IconFile /> },
      { key: "profile", label: "Profil", to: "/profile", icon: <IconUser /> },
    ],
    []
  );

  const sidebarWidth = sidebarCollapsed ? 78 : 260;

  const handleLogout = () => {
    if (onLogout) return onLogout();

    try {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    } catch {
      // ignore
    }
    navigate("/logout");
  };

  const vars = THEMES[theme].vars;

  const linkBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: sidebarCollapsed ? 0 : 12,
    padding: sidebarCollapsed ? "10px 10px" : "10px 14px",
    borderRadius: 10,
    textDecoration: "none",
    color: "var(--sb-text)" as any,
    fontSize: 14.5,
    lineHeight: 1,
    userSelect: "none",
  };

  return (
    <div
      style={
        {
          minHeight: "100vh",
          background: "var(--app-bg)",
          color: "var(--app-text)",
          ["--app-bg" as any]: vars.appBg,
          ["--app-text" as any]: vars.appText,

          ["--sb-bg" as any]: vars.sidebarBg,
          ["--sb-header" as any]: vars.sidebarHeaderBg,
          ["--sb-text" as any]: theme === "snowlight" ? "#0F172A" : "rgba(255,255,255,0.92)",

          ["--item-hover" as any]: vars.itemHover,
          ["--item-active" as any]: vars.itemActive,

          ["--surface" as any]: vars.surface,
          ["--surface-border" as any]: vars.surfaceBorder,

          ["--logout-bg" as any]: vars.logoutBg,
          ["--sb-border" as any]: vars.sidebarBorder,
          ["--sb-shadow" as any]: vars.shadow,
        } as React.CSSProperties
      }
    >
      <style>{`
        .syncan-sidebar { scrollbar-width: none; }
        .syncan-sidebar::-webkit-scrollbar { width: 0px; height: 0px; }
        .syncan-sidebar::-webkit-scrollbar-thumb { background: transparent; }
        .syncan-hover:hover { background: var(--item-hover); }
        .syncan-active { background: var(--item-active); }
        .syncan-sidebar[data-theme="snowlight"] { scrollbar-color: rgba(15,23,42,.22) transparent; }
        .syncan-sidebar[data-theme="snowlight"]::-webkit-scrollbar-thumb { background: rgba(15,23,42,.18); }
        .syncan-active { border: 1px solid rgba(255,255,255,0.06); }
        .syncan-sidebar[data-theme="snowlight"] .syncan-active { border: 1px solid rgba(15,23,42,0.08); }
      
        .syncan-hover {
          position: relative;
        }

        `}</style>

      <aside
        style={{
          width: sidebarWidth,
          position: "fixed",
          left: 12,
          top: 12,
          bottom: 12,
          borderRadius: 18,
          overflow: "visible",
          background: "var(--sb-bg)",
          boxShadow: "var(--sb-shadow)",
          display: isMobile ? "none" : "flex",
          flexDirection: "column",
          border: `1px solid var(--sb-border)`,
        }}
      >
        {/* Header */}
        <div
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "SynCan" : "SynCan"}
          className="syncan-hover"
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            padding: sidebarCollapsed ? "0" : "0 14px",
            background: "var(--sb-header)",
            color: "var(--sb-text)",
            fontWeight: 900,
            letterSpacing: 0.3,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: "var(--sb-chip)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 950,
                fontSize: 23
              }}
            >
              {String(brandTitle).slice(0, 1)}
            </div>

            {!sidebarCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
                <span style={{ fontSize: 23, opacity: 0.96, marginBottom: 0 }}>{brandTitle}</span>
                {/* <span style={{ fontSize: 10, fontWeight: 900, opacity: 0.72 }}>
                  {sidebarCollapsed ? "by Candi Elektronik" : "by Candi Elektronik"}
                </span> */}
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <span style={{ display: "inline-flex", opacity: 0.85 }}>
              <IconChevronLeft />
            </span>
          )}
        </div>

        {/* Menu */}
        <nav
          className="syncan-sidebar"
          data-theme={theme}
          style={{
            padding: sidebarCollapsed ? 10 : 12,
            // overflowY: "auto",
            flex: 1,
          }}
        >
          <MenuLink to="/dashboard" icon={<IconMonitor />} label="Dashboard" linkBase={linkBase} collapsed={sidebarCollapsed} />

          {/* <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setOpenMaster((v) => !v)}
              className="syncan-hover"
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: "var(--sb-text)",
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "space-between",
                fontSize: 14.5,
                fontWeight: 700,
              }}
              aria-expanded={openMaster}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 18, height: 18, display: "inline-flex", color: "var(--sb-text)" }}>
                  <IconGrid />
                  {sidebarCollapsed && (
                    <span
                      style={{
                        position: "absolute",
                        right: -3,
                        bottom: 15,
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "var(--sb-text)",
                        opacity: 0.45,
                      }}
                    />
                  )}
                </span>
                {!sidebarCollapsed && <span>Master</span>}
              </span>

              {!sidebarCollapsed && (
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    color: "var(--sb-text)",
                    background: theme === "snowlight" ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)",
                    fontWeight: 900,
                  }}
                  title={openMaster ? "Tutup" : "Buka"}
                >
                  {openMaster ? "−" : "+"}
                </span>
              )}
            </button>

            {openMaster && (
              <div style={{ marginTop: 6, paddingLeft: sidebarCollapsed ? 0 : 10 }}>
                <MenuLink to="/supplier" icon={<IconGrid />} label="Supplier" linkBase={linkBase} collapsed={sidebarCollapsed} />
                <MenuLink to="/branch" icon={<IconGrid />} label="Branch" linkBase={linkBase} collapsed={sidebarCollapsed} />
              </div>
            )}
          </div> */}

          <div style={{ marginTop: 6 }}>
            <MenuLink to="/inventory" icon={<IconBox />} label="Inventory" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
          <div style={{ marginTop: 6 }}>
            <MenuLink to="/assets" icon={<IconLayers />} label="Assets" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
          <div style={{ marginTop: 6 }}>
            <MenuLink to="/toner" icon={<IconPrinter />} label="Toner" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
          <div style={{ marginTop: 6 }}>
            <MenuLink to="/flow" icon={<IconShare />} label="Flow Network" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
          <div style={{ marginTop: 6 }}>
            <MenuLink to="/trash" icon={<IconTrash />} label="Trash" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
          <div style={{ marginTop: 6 }}>
            <MenuLink to="/report" icon={<IconFile />} label="Report" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
        </nav>

        {/* Bottom: Theme + Logout */}
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ marginTop: 6 }}>
            <MenuLink to="/profile" icon={<IconUser />} label="Profile" linkBase={linkBase} collapsed={sidebarCollapsed} />
          </div>
          {/* Theme Switcher (swatch only) */}
          <div style={{ display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "snowlight" ? "midnight" : "snowlight"))}
              className="syncan-hover"
              title={theme === "snowlight" ? "Snowlight" : "Midnight"}
              style={{
                width: sidebarCollapsed ? 44 : "100%",
                height: 36,
                borderRadius: 14,
                border: `1px solid var(--surface-border)`,
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "space-between",
                gap: 10,
                cursor: "pointer",
                padding: sidebarCollapsed ? 0 : "0 12px",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `1px solid var(--surface-border)`,
                  background:
                    theme === "snowlight"
                      ? "linear-gradient(135deg, rgba(239,246,255,1) 0%, rgba(219,234,254,1) 100%)"
                      : "linear-gradient(135deg, rgba(11,18,32,1) 0%, rgba(30,41,59,1) 100%)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
                }}
              />
              {!sidebarCollapsed && (
                <span style={{ fontWeight: 900, color: "var(--sb-text)", opacity: 0.65 }}>
                  {theme === "snowlight" ? "Snowlight" : "Midnight"}
                </span>
              )}
            </button>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
            style={{
              width: "100%",
              border: "none",
              cursor: "pointer",
              borderRadius: 14,
              padding: sidebarCollapsed ? "12px 10px" : "12px 14px",
              background: "var(--logout-bg)",
              color: "#FFFFFF",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: sidebarCollapsed ? 0 : 12,
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              boxShadow: "0 10px 22px rgba(29,78,216,0.28)",
            }}
          >
            <span style={{ width: 18, height: 18, display: "inline-flex" }}>
              <IconLogout />
            </span>
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      <main
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth + 24,
          padding: isFlowRoute
            ? 0
            : isMobile
              ? "16px 16px 80px"
              : 24,
          color: "var(--app-text)",
          height: isFlowRoute ? "100vh" : "auto",
          overflow: isFlowRoute ? "hidden" : "auto",
        }}
      >
        {children}
      </main>


      {isMobile && <MobileBottomNav />}
    </div>
  );
}

/* ---------- Helpers ---------- */

function MenuLink({
  to,
  icon,
  label,
  linkBase,
  collapsed = false,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  linkBase: React.CSSProperties;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Kalau lagi di /flow dan mau pindah ke halaman lain → full reload
    if (location.pathname.startsWith("/flow") && location.pathname !== to) {
      e.preventDefault();
      window.location.href = to;
    }
  };

  return (
    <>
      <NavLink
        ref={linkRef}
        to={to}
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={({ isActive }) => ({
          ...linkBase,
          background: isActive ? ("var(--item-active)" as any) : "transparent",
          fontWeight: isActive ? 800 : 600,
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 12,
          padding: collapsed ? "10px 10px" : linkBase.padding,
          position: "relative",
        })}
        className={({ isActive }) =>
          `syncan-hover ${isActive ? "syncan-active" : ""}`
        }
      >
        <span
          style={{
            width: 18,
            height: 18,
            display: "inline-flex",
            color: "var(--sb-text)",
          }}
        >
          {icon}
        </span>

        {!collapsed && <span>{label}</span>}
      </NavLink>

      {collapsed && (
        <PortalTooltip
          show={hover}
          rect={linkRef.current?.getBoundingClientRect() || null}
          label={label}
        />
      )}
    </>
  );
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMore, setOpenMore] = useState(false);

  const [theme, setTheme] = useState<"snowlight" | "midnight">(() => {
    if (typeof window === "undefined") return "snowlight";
    const raw = (localStorage.getItem("syncan_theme") || "snowlight").toLowerCase();
    return raw === "midnight" ? "midnight" : "snowlight";
  });

  useEffect(() => {
    const onTheme = (e: any) => {
      const raw = (e?.detail || "").toString().toLowerCase();
      if (raw === "midnight" || raw === "snowlight") {
        setTheme(raw as "snowlight" | "midnight");
      }
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "syncan_theme") {
        const raw = (ev.newValue || "").toString().toLowerCase();
        if (raw === "midnight" || raw === "snowlight") {
          setTheme(raw as "snowlight" | "midnight");
        }
      }
    };
    window.addEventListener("syncan-theme", onTheme as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("syncan-theme", onTheme as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleTheme = () => {
    const next: "snowlight" | "midnight" =
      theme === "midnight" ? "snowlight" : "midnight";
    setTheme(next);
    try {
      localStorage.setItem("syncan_theme", next);
    } catch { }
    window.dispatchEvent(
      new CustomEvent("syncan-theme", { detail: next })
    );
  };

  const baseItemStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    paddingTop: isActive ? 20 : 12,
    paddingBottom: 6,
    // borderRadius: 999,
    border: "none",
    background: "transparent",
    transition: "background 0.2s ease",
    textDecoration: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    fontSize: 11,
    letterSpacing: 0.02,
    fontWeight: isActive ? 700 : 500,
    color: "var(--app-text)",
    position: "relative",
  });

  const buttonStyle: React.CSSProperties = {
    flex: 1,
    padding: "4px 4px 2px",
    border: "none",
    background: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--app-text)",
  };

  const getItemIconStyle = (isActive: boolean): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: isActive ? -23 : 0,
    marginBottom: 2,
    background: isActive ? "#EF4444" : "transparent",
    // boxShadow: isActive
    //   ? "0 10px 25px rgba(15, 23, 42, 0.20)"
    //   : "none",
    color: isActive ? "#ffffff" : "var(--app-text)",
    transition:
      "background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, margin-top 0.2s ease",
  });

  const handleGo = (path: string) => {
    setOpenMore(false);

    // Kalau lagi di /flow dan mau pindah ke halaman lain,
    // paksa full reload agar editor Isoflow benar-benar hilang.
    if (location.pathname.startsWith("/flow") && location.pathname !== path) {
      window.location.href = path;
      return;
    }

    // Di luar /flow tetap SPA biasa
    navigate(path);
  };

  return (
    <>
      {/* Bottom bar utama */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          padding: "6px 10px",
          background: "var(--sb-bg)",
          borderTop: "1px solid var(--sb-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          zIndex: 40,
        }}
      >
        <NavLink
          to="/inventory"
          onClick={(e) => {
            // Kalau dari /flow → jangan SPA, langsung reload
            if (location.pathname.startsWith("/flow") && location.pathname !== "/dashboard") {
              e.preventDefault();
              handleGo("/dashboard");
            }
          }}
          style={({ isActive }) => baseItemStyle(!!isActive) as React.CSSProperties}
          className={({ isActive }) => `syncan-hover ${isActive ? "syncan-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <span style={getItemIconStyle(!!isActive)}>
                <IconBox />
              </span>
              <span>Inventory</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/assets"
          onClick={(e) => {
            if (location.pathname.startsWith("/flow") && location.pathname !== "/assets") {
              e.preventDefault();
              handleGo("/assets");
            }
          }}
          style={({ isActive }) => baseItemStyle(!!isActive) as React.CSSProperties}
          className={({ isActive }) => `syncan-hover ${isActive ? "syncan-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <span style={getItemIconStyle(!!isActive)}>
                <IconLayers />
              </span>
              <span>Assets</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/dashboard"
          onClick={(e) => {
            // Kalau dari /flow → jangan SPA, langsung reload
            if (location.pathname.startsWith("/flow") && location.pathname !== "/dashboard") {
              e.preventDefault();
              handleGo("/dashboard");
            }
          }}
          style={({ isActive }) => baseItemStyle(!!isActive) as React.CSSProperties}
          className={({ isActive }) => `syncan-hover ${isActive ? "syncan-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <span style={getItemIconStyle(!!isActive)}>
                <IconMonitor />
              </span>
              <span>Home</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/toner"
          onClick={(e) => {
            if (location.pathname.startsWith("/flow") && location.pathname !== "/toner") {
              e.preventDefault();
              handleGo("/toner");
            }
          }}
          style={({ isActive }) => baseItemStyle(!!isActive) as React.CSSProperties}
          className={({ isActive }) => `syncan-hover ${isActive ? "syncan-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <span style={getItemIconStyle(!!isActive)}>
                <IconPrinter />
              </span>
              <span>Toner</span>
            </>
          )}
        </NavLink>

        {/* Tombol MORE */}
        <button type="button" style={buttonStyle} onClick={() => setOpenMore(true)}>
          <span style={getItemIconStyle(false)}>
            {/* pakai IconGrid sebagai icon “more/menu” */}
            <IconGrid />
          </span>
          <span>More</span>
        </button>
      </div>

      {/* Sheet More */}
      {openMore && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 45,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setOpenMore(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--sb-bg)",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              border: "1px solid var(--sb-border)",
              boxShadow: "var(--sb-shadow)",
              padding: 16,
              paddingBottom: 16,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header sheet */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--app-text)",
                }}
              >
                More menu
              </div>
              <button
                type="button"
                onClick={() => setOpenMore(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--app-text)",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Master group */}
            {/* <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.06,
                opacity: 0.7,
                marginBottom: 4,
              }}
            >
              Master
            </div>

            <button
              type="button"
              onClick={() => handleGo("/supplier")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={getItemIconStyle(false)}>
                <IconGrid />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>Supplier</span>
            </button>

            <button
              type="button"
              onClick={() => handleGo("/branch")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={getItemIconStyle(false)}>
                <IconGrid />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>Branch</span>
            </button> */}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "var(--sb-border)",
                opacity: 0.7,
                margin: "10px 0",
              }}
            />

            {/* Menu lain */}
            <button
              type="button"
              onClick={() => handleGo("/flow")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={getItemIconStyle(false)}>
                <IconPrinter />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>Flow</span>
            </button>

            <button
              type="button"
              onClick={() => handleGo("/trash")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={getItemIconStyle(false)}>
                <IconTrash />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>Trash</span>
            </button>

            <button
              type="button"
              onClick={() => handleGo("/report")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={getItemIconStyle(false)}>
                <IconFile />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>Report</span>
            </button>

            <button
              type="button"
              onClick={() => handleGo("/profile")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={getItemIconStyle(false)}>
                <IconUser />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--app-text)" }}>Profile</span>
            </button>

            {/* Theme switch */}
            <div
              style={{
                marginTop: 8,
                marginBottom: 4,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.06,
                opacity: 0.7,
              }}
            >
              Theme
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                width: "100%",
                borderRadius: 999,
                border: "1px solid var(--sb-border)",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background:
                  theme === "midnight"
                    ? "linear-gradient(135deg, #020617, #020617)"
                    : "linear-gradient(135deg, #dbeafe, #eff6ff)",
                cursor: "pointer",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme === "midnight" ? "#e5e7eb" : "#0f172a",
                }}
              >
                {theme === "midnight" ? "Midnight" : "Snowlight"}
              </span>
              <span
                style={{
                  width: 34,
                  height: 18,
                  borderRadius: 999,
                  background:
                    theme === "midnight"
                      ? "rgba(15,23,42,0.9)"
                      : "rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  boxShadow: "0 0 0 1px rgba(15,23,42,0.15)",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "999px",
                    background:
                      theme === "midnight" ? "#0ea5e9" : "#2563eb",
                    transform:
                      theme === "midnight"
                        ? "translateX(16px)"
                        : "translateX(0)",
                    transition: "transform 0.18s ease",
                  }}
                />
              </span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={() => handleGo("/logout")}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "9px 6px 4px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 10,
                cursor: "pointer",
                marginTop: 6,
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.9,
              }}
            >
              <span style={getItemIconStyle(false)}>
                {/* pakai IconShare sebagai “keluar” kecil, kalau mau bisa diganti ikon khusus */}
                <IconShare />
              </span>
              <span style={{ color: "var(--app-text)" }}>Logout</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}



/* ---------- Icons ---------- */

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

function IconMonitor() {
  return (
    <IconBase>
      <path
        d="M4 5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V15.5C20 16.3284 19.3284 17 18.5 17H13.2L14.2 20H9.8L10.8 17H5.5C4.67157 17 4 16.3284 4 15.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

function IconGrid() {
  return (
    <IconBase>
      <path d="M4.5 4.5H10.5V10.5H4.5V4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13.5 4.5H19.5V10.5H13.5V4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4.5 13.5H10.5V19.5H4.5V13.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13.5 13.5H19.5V19.5H13.5V13.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </IconBase>
  );
}

function IconBox() {
  return (
    <IconBase>
      <path
        d="M7 8.5L12 6L17 8.5V15.5L12 18L7 15.5V8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 6V18" stroke="currentColor" opacity="0.35" strokeWidth="1.7" />
    </IconBase>
  );
}

function IconLayers() {
  return (
    <IconBase>
      <path d="M12 4L20 8L12 12L4 8L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M20 12L12 16L4 12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M20 16L12 20L4 16" stroke="currentColor" opacity="0.6" strokeWidth="1.7" strokeLinejoin="round" />
    </IconBase>
  );
}

function IconShare() {
  return (
    <IconBase>
      <path
        d="M8.5 12C10.5 12 12 10.5 12 8.5C12 6.5 10.5 5 8.5 5C6.5 5 5 6.5 5 8.5C5 10.5 6.5 12 8.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M15.5 19C17.5 19 19 17.5 19 15.5C19 13.5 17.5 12 15.5 12C13.5 12 12 13.5 12 15.5C12 17.5 13.5 19 15.5 19Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M11.1 10.4L13 12.3" stroke="currentColor" opacity="0.6" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

function IconPrinter() {
  return (
    <IconBase>
      <path
        d="M7 8V5.5C7 4.67157 7.67157 4 8.5 4H15.5C16.3284 4 17 4.67157 17 5.5V8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 18H6C4.89543 18 4 17.1046 4 16V11C4 9.89543 4.89543 9 6 9H18C19.1046 9 20 9.89543 20 11V16C20 17.1046 19.1046 18 18 18H16.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8 14H16V20H8V14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </IconBase>
  );
}

function IconTrash() {
  return (
    <IconBase>
      <path d="M9 4H15M4 7H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 7L8 20H16L17 7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 11V17M14 11V17" stroke="currentColor" opacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

function IconFile() {
  return (
    <IconBase>
      <path d="M7 4H14L18 8V20H7V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 4V8H18" stroke="currentColor" opacity="0.6" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12H16M9 15H16" stroke="currentColor" opacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

function IconUser() {
  return (
    <IconBase>
      <path
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 20C5.8 16.8 8.6 15 12 15C15.4 15 18.2 16.8 19 20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

function IconLogout() {
  return (
    <IconBase>
      <path
        d="M10 17H7C5.89543 17 5 16.1046 5 15V9C5 7.89543 5.89543 7 7 7H10"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 12H9" stroke="rgba(255,255,255,0.95)" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M15 12L13 10M15 12L13 14"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 4V20" stroke="rgba(255,255,255,0.25)" strokeWidth="1.7" strokeLinecap="round" />
    </IconBase>
  );
}

function IconPalette() {
  return (
    <IconBase>
      <path
        d="M12 4C7.582 4 4 7.134 4 11c0 4.418 3.582 8 8 8h2.4c1.105 0 2-.895 2-2 0-.552-.224-1.052-.586-1.414l-.214-.214c-.362-.362-.586-.862-.586-1.414 0-1.105.895-2 2-2H19c.552 0 1-.448 1-1C20 7.134 16.418 4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.2 10.5h0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M11 8.8h0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14.2 9.6h0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </IconBase>
  );
}
function IconChevronLeft() {
  return (
    <IconBase>
      <path
        d="M14.5 5.5L9 11l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

function IconChevronRight() {
  return (
    <IconBase>
      <path
        d="M9.5 5.5L15 11l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}