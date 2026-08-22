import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  fetchDashboardSummary,
  fetchDashboardTonerSummary,
  fetchRecentActivityTrends,
  type DashboardSummary
} from "../services/itService";

type ThemeName = "snowlight" | "midnight";
const THEME_KEY = "syncan_theme";

function getThemeName(): ThemeName {
  try {
    const t = String(localStorage.getItem(THEME_KEY) || "snowlight").toLowerCase();
    return (t === "midnight" ? "midnight" : "snowlight");
  } catch {
    return "snowlight";
  }
}

function useSyncanTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(getThemeName());

  useEffect(() => {
    const onTheme = (e: any) => {
      const t = String(e?.detail || "").toLowerCase();
      setTheme(t === "midnight" ? "midnight" : "snowlight");
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === THEME_KEY) setTheme(getThemeName());
    };

    window.addEventListener("syncan-theme", onTheme as any);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("syncan-theme", onTheme as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return theme;
}

function useThemeVars(theme: ThemeName): React.CSSProperties {
  const dark = theme === "midnight";
  return {
    ["--text-1" as any]: dark ? "rgba(255,255,255,0.95)" : "#0F172A",
    ["--text-2" as any]: dark ? "rgba(255,255,255,0.78)" : "#475569",
    ["--muted" as any]: dark ? "rgba(255,255,255,0.62)" : "#64748B",
    ["--text-3" as any]: dark ? "rgba(255,255,255,0.45)" : "#94A3B8",

    ["--card-bg" as any]: dark ? "#2B313D" : "#FFFFFF",
    ["--card-border" as any]: dark ? "rgba(255,255,255,0.10)" : "#E2E8F0",
    ["--card-divider" as any]: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
    ["--card-shadow" as any]: dark ? "0 10px 26px rgba(0,0,0,0.35)" : "0 1px 10px rgba(0,0,0,0.06)",

    ["--hover-1" as any]: dark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
    ["--row-hover" as any]: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC",

    ["--blue" as any]: dark ? "#60A5FA" : "#3B82F6",
    ["--green" as any]: dark ? "#10B981" : "#10B981",
    ["--amber" as any]: dark ? "#F59E0B" : "#F59E0B",
    ["--purple" as any]: dark ? "#8B5CF6" : "#8B5CF6",
    ["--red" as any]: dark ? "#EF4444" : "#EF4444",

    // Material Design Colors
    ["--md-primary" as any]: dark ? "#90CAF9" : "#2196F3",
    ["--md-success" as any]: dark ? "#81C784" : "#4CAF50",
    ["--md-warning" as any]: dark ? "#FFB74D" : "#FF9800",
    ["--md-error" as any]: dark ? "#E57373" : "#F44336",
    ["--md-info" as any]: dark ? "#4FC3F7" : "#00BCD4",
  } as React.CSSProperties;
}

// ---------- Icons ----------
const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  </svg>
);

const InventoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z" />
  </svg>
);

const AssetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 15l-5-5h3V9h4v4h3l-5 5z" />
  </svg>
);

const RepairIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
  </svg>
);

const TonerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 9v10H8V9h8zm-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
  </svg>
);

const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" />
  </svg>
);

// ---------- Material Dashboard KPI Card ----------
function MaterialKpiCard({
  title,
  value,
  icon,
  color = "info",
  trend,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: "info" | "success" | "warning" | "error" | "primary" | "ghost";
  trend?: { value: number; label: string };
  subtitle?: string;
}) {
  // const colorMap = {
  //   info: { bg: "#E3F2FD", icon: "#2196F3", text: "#0D47A1" },
  //   success: { bg: "#E8F5E9", icon: "#4CAF50", text: "#1B5E20" },
  //   warning: { bg: "#FFF3E0", icon: "#FF9800", text: "#E65100" },
  //   error: { bg: "#FFEBEE", icon: "#F44336", text: "#B71C1C" },
  //   primary: { bg: "#F3E5F5", icon: "#9C27B0", text: "#4A148C" },
  //   ghost: { bg: "#F5F5F5", icon: "#9E9E9E", text: "#424242" },
  // };
  const colorMap = {
    info: {
      bg: "color-mix(in srgb, var(--blue) 18%, transparent)",
      icon: "var(--blue)",
    },
    success: {
      bg: "color-mix(in srgb, var(--green) 18%, transparent)",
      icon: "var(--green)",
    },
    warning: {
      bg: "color-mix(in srgb, var(--amber) 18%, transparent)",
      icon: "var(--amber)",
    },
    error: {
      bg: "color-mix(in srgb, var(--red) 18%, transparent)",
      icon: "var(--red)",
    },
    primary: {
      bg: "color-mix(in srgb, var(--purple) 18%, transparent)",
      icon: "var(--purple)",
    },
    ghost: {
      bg: "var(--hover-1)",
      icon: "var(--muted)",
    },
  };

  const colors = colorMap[color];

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        boxShadow: "var(--card-shadow)",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)";
      }}
    >
      {/* Background circle yang lebih kecil dan posisi lebih baik */}
      <div style={{
        position: "absolute",
        top: "-16px",
        right: "-16px",
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        background: colors.bg,
        opacity: 0.3,
      }} />

      <div style={{
        padding: "20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        position: "relative",
        zIndex: 1,
        height: "100%",
        flex: 1,
      }}>
        {/* Icon container */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            background: colors.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: colors.icon,
            fontSize: "24px",
          }}
        >
          {icon}
        </div>

        {/* Content container - mengambil sisa space */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
        }}>
          {/* Top section: title */}
          <div style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-2)",
            marginBottom: "8px",
            letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}>
            {title}
          </div>

          {/* Middle section: value */}
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--text-1)",
              marginBottom: "8px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              wordBreak: "break-word",
            }}
          >
            {value}
          </div>

          {/* Bottom section: subtitle and trend */}
          <div>
            {subtitle && (
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "#7B809A",
                  marginBottom: trend ? "6px" : "0",
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </div>
            )}

            {trend && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: trend.value >= 0 ? "#4CAF50" : "#F44336",
                  marginTop: subtitle ? "2px" : "0",
                }}
              >
                {trend.value >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span style={{
                  color: "#7B809A",
                  fontWeight: 400,
                  marginLeft: "4px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {trend.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom border accent - lebih tipis */}
      <div style={{
        height: "3px",
        background: colors.icon,
        opacity: 0.8,
      }} />
    </div>
  );
}

// ---------- UI Components ----------
function Card({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        borderRadius: 8,
        border: "1px solid var(--card-border)",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--card-shadow)",
        ...style,
      }}
    >
      {(title || right) && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--card-divider)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {title && (
            <div style={{
              fontWeight: 700,
              color: "var(--text-1)",
              fontSize: 15,
              letterSpacing: "-0.01em"
            }}>
              {title}
            </div>
          )}
          {right && (
            <div style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontWeight: 600
            }}>
              {right}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: 20, flex: 1 }}>{children}</div>
    </div>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blue" | "amber" | "red" | "gray" | "purple";
}) {
  const map: Record<typeof tone, { bg: string; fg: string; border: string }> = {
    green: { bg: "#ECFDF5", fg: "#047857", border: "#A7F3D0" },
    blue: { bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
    amber: { bg: "#FFFBEB", fg: "#B45309", border: "#FDE68A" },
    red: { bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
    gray: { bg: "#F8FAFC", fg: "#475569", border: "#E0E8F0" },
    purple: { bg: "#F5F3FF", fg: "#6D28D9", border: "#DDD6FE" },
  };

  const style = map[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 4,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.fg,
        fontWeight: 600,
        fontSize: 11,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </span>
  );
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

// Custom Tooltip Components
function BarTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 6,
          padding: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          fontSize: 12,
        }}
      >
        <div style={{
          color: "var(--text-2)",
          fontWeight: 600,
          marginBottom: 4,
          fontSize: 11
        }}>
          {label}
        </div>
        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: entry.color,
              }}
            />
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              {entry.name}:
            </span>
            <span style={{ color: entry.color, fontWeight: 700, marginLeft: 'auto' }}>
              {fmtInt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function PieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 6,
          padding: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          fontSize: 12,
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4
        }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: payload[0].payload.fill,
            }}
          />
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
            {payload[0].name}
          </span>
        </div>
        <div style={{
          color: "var(--text-2)",
          fontWeight: 600,
          fontSize: 11
        }}>
          Qty: <span style={{ color: "var(--text-1)", fontWeight: 700 }}>
            {fmtInt(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

// Material Design Activity Trends Tooltip
function MaterialTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E0E0E0",
          borderRadius: "8px",
          padding: "12px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#7B809A",
            marginBottom: "8px",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>
        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                background: entry.color,
              }}
            />
            <span style={{ color: "#424242", fontWeight: 500 }}>{entry.name}:</span>
            <span style={{ color: entry.color, fontWeight: 700, marginLeft: "auto" }}>
              {fmtInt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const theme = useSyncanTheme();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [tonerData, setTonerData] = useState<any>(null);
  const [activityTrends, setActivityTrends] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      fetchDashboardSummary(),
      fetchDashboardTonerSummary(),
      fetchRecentActivityTrends()
    ])
      .then(([dashboardData, tonerSummary, trends]) => {
        if (!alive) return;
        setData(dashboardData);
        setTonerData(tonerSummary);
        setActivityTrends(trends.trends || []);
        setError("");
      })
      .catch((e) => {
        if (!alive) return;
        console.error("Dashboard load error:", e);
        setError(e?.message || "Failed to load dashboard");

        // Fallback data for demo
        if (!data) {
          setData({
            kpis: {
              totalAssets: 9,
              totalInventoryQty: 130,
              lowStockItems: 1,
              assetsInRepair: 0,
              trashCount: 0,
            },
            assetsByStatus: [
              { name: "IN_STOCK", value: 5 },
              { name: "IN_USE", value: 4 },
            ],
            inventoryByLocation: [
              { name: "Gudang A", value: 60 },
              { name: "Gudang B", value: 45 },
              { name: "Gudang C", value: 25 },
            ],
            recentAssets: Array.from({ length: 5 }, (_, i) => ({
              id: String(i + 1),
              assetTag: `AST-${1000 + i}`,
              name: ["Laptop Dell XPS", "PC Workstation", "Server Rack", "Network Switch", "Printer HP"][i],
              status: i < 3 ? "IN_USE" : "IN_STOCK",
              type: "LAPTOP",
              location: "Office",
              assignedTo: i < 3 ? `User ${i + 1}` : undefined,
            })),
            lowStockList: Array.from({ length: 5 }, (_, i) => ({
              id: String(i + 1),
              sku: `SKU-${5000 + i}`,
              name: ["SSD 1TB", "RAM 16GB", "Network Cable", "Keyboard", "Mouse"][i],
              category: "STORAGE",
              stock: [2, 1, 5, 3, 4][i],
              minStock: [5, 5, 10, 8, 10][i],
              location: "Warehouse A",
            })),
          });
          setTonerData({
            byStatus: [
              { name: "PENDING", value: 1 },
              { name: "ON_PROGRESS", value: 1 },
              { name: "FINISH", value: 2 },
            ],
            notFinishCount: 2,
            recentNotFinish: Array.from({ length: 5 }, (_, i) => ({
              id: String(i + 1),
              tonerSerial: `TNR-202401-0${i + 1}`,
              name: `Toner ${["Black", "Cyan", "Magenta", "Yellow", "Black"][i]}`,
              status: i < 3 ? "PENDING" : "ON_PROGRESS",
              location: ["Printer Room", "Office", "Lab", "Warehouse", "Admin"][i],
            })),
            total: 4,
          });
          setActivityTrends([
            { date: 'Mon', assets: 12, inventory: 8, toner: 5 },
            { date: 'Tue', assets: 18, inventory: 12, toner: 7 },
            { date: 'Wed', assets: 15, inventory: 10, toner: 6 },
            { date: 'Thu', assets: 22, inventory: 15, toner: 9 },
            { date: 'Fri', assets: 19, inventory: 13, toner: 8 },
            { date: 'Sat', assets: 8, inventory: 6, toner: 4 },
            { date: 'Sun', assets: 5, inventory: 4, toner: 3 },
          ]);
        }
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const statusColors = useMemo(() => {
    return {
      IN_USE: "#10B981",
      IN_STOCK: "#3B82F6",
      REPAIR: "#F59E0B",
      RETIRED: "#94A3B8",
      UNKNOWN: "#CBD5E1",
    } as Record<string, string>;
  }, []);

  const tonerStatusColors = useMemo(() => {
    return {
      PENDING: "#3B82F6",
      ON_PROGRESS: "#F59E0B",
      FINISH: "#10B981",
    } as Record<string, string>;
  }, []);

  const locationColors = useMemo(
    () => ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#94A3B8", "#F97316", "#EC4899"],
    []
  );

  const activityColors = useMemo(
    () => ({
      assets: "#2196F3",
      inventory: "#4CAF50",
      toner: "#9C27B0",
    }),
    []
  );

  const kpis = data?.kpis;

  const safeRecentAssets = useMemo(() => {
    return (data?.recentAssets ?? []).filter((a: any) => (a as any).isActive !== 0);
  }, [data?.recentAssets]);

  const safeLowStockList = useMemo(() => {
    return (data?.lowStockList ?? []).filter((i: any) => (i as any).isActive !== 0);
  }, [data?.lowStockList]);

  return (
    <AppLayout>
      <div style={useThemeVars(theme)}>
        {/* Header */}
        <div
          style={{
            marginBottom: 28,
          }}
        >
          <div style={{
            fontSize: 13,
            color: "var(--text-3)",
            fontWeight: 500,
            marginBottom: 8
          }}>
            <a href="/dashboard" style={{
              color: "var(--text-3)",
              textDecoration: "none",
              transition: "color 150ms ease"
            }}>
              Home
            </a>
            {" > Dashboard"}
          </div>
          <div style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text-1)",
            letterSpacing: "-0.02em"
          }}>
            Dashboard
          </div>
        </div>

        {loading ? (
          <div style={{
            color: "var(--text-2)",
            fontWeight: 600,
            textAlign: "center",
            padding: 60,
            fontSize: 14
          }}>
            Loading dashboard data...
          </div>
        ) : error ? (
          <div style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "12px 16px",
            color: "#B91C1C",
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 20
          }}>
            ⚠️ {error}
          </div>
        ) : null}

        {/* Material Design KPI Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "24px",
            marginBottom: 32,
            opacity: loading ? 0.6 : 1,
          }}
        >
          <MaterialKpiCard
            title="TOTAL ASSETS"
            value={fmtInt(kpis?.totalAssets ?? 0)}
            icon={<AssetIcon />}
            color="info"
            subtitle="Registered assets"
          // trend={{ value: 12, label: "since last month" }}
          />
          <MaterialKpiCard
            title="TOTAL INVENTORY"
            value={fmtInt(kpis?.totalInventoryQty ?? 0)}
            icon={<InventoryIcon />}
            color="success"
            subtitle="Total quantity"
          // trend={{ value: 8, label: "since last week" }}
          />
          <MaterialKpiCard
            title="LOW STOCK"
            value={fmtInt(kpis?.lowStockItems ?? 0)}
            icon={<DashboardIcon />}
            color="warning"
            subtitle="Below minimum stock"
          // trend={{ value: -2, label: "since yesterday" }}
          />
          <MaterialKpiCard
            title="ASSETS IN REPAIR"
            value={fmtInt(kpis?.assetsInRepair ?? 0)}
            icon={<RepairIcon />}
            color="error"
            subtitle="Need attention"
          // trend={{ value: 0, label: "no change" }}
          />
          <MaterialKpiCard
            title="TOTAL TONER"
            value={fmtInt(tonerData?.total ?? 0)}
            icon={<TonerIcon />}
            color="primary"
            subtitle={`${tonerData?.notFinishCount ?? 0} not finished`}
          // trend={{ value: 5, label: "since last month" }}
          />
          <MaterialKpiCard
            title="TRASH"
            value={fmtInt(kpis?.trashCount ?? 0)}
            icon={<TrashIcon />}
            color="ghost"
            subtitle={`Items in trash`}
          // trend={{ value: 5, label: "since last month" }}
          />
        </div>

        {/* Charts Grid - 2 columns for desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: 20,
            marginBottom: 28,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {/* Assets by Status */}
          <Card
            title="Assets by Status"
            right={`Total: ${fmtInt(kpis?.totalAssets ?? 0)} assets`}
            style={{ minHeight: 320 }}
          >
            <div style={{ height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.assetsByStatus ?? []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--card-divider)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "var(--text-2)",
                      fontSize: 11,
                      fontWeight: 500
                    }}
                    axisLine={{ stroke: "var(--card-divider)" }}
                    tickLine={{ stroke: "var(--card-divider)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fill: "var(--text-2)",
                      fontSize: 11,
                      fontWeight: 500
                    }}
                    axisLine={{ stroke: "var(--card-divider)" }}
                    tickLine={{ stroke: "var(--card-divider)" }}
                  />
                  <Tooltip
                    content={<BarTooltip />}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar
                    dataKey="value"
                    name="Jumlah"
                    radius={[4, 4, 0, 0]}
                  >
                    {(data?.assetsByStatus ?? []).map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={statusColors[entry.name] || statusColors.UNKNOWN}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Inventory by Location */}
          <Card
            title="Inventory by Location"
            right={`Total: ${fmtInt(kpis?.totalInventoryQty ?? 0)} qty`}
            style={{ minHeight: 320 }}
          >
            <div style={{ height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.inventoryByLocation ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={1}
                    stroke="var(--card-bg)"
                  >
                    {(data?.inventoryByLocation ?? []).map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={locationColors[idx % locationColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<PieTooltip />}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-2)",
                    }}
                    iconSize={8}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Toner by Status */}
          <Card
            title="Toner by Status"
            right={`Total: ${fmtInt(tonerData?.total ?? 0)} toner`}
            style={{ minHeight: 320 }}
          >
            <div style={{ height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tonerData?.byStatus ?? []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--card-divider)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "var(--text-2)",
                      fontSize: 11,
                      fontWeight: 500
                    }}
                    axisLine={{ stroke: "var(--card-divider)" }}
                    tickLine={{ stroke: "var(--card-divider)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fill: "var(--text-2)",
                      fontSize: 11,
                      fontWeight: 500
                    }}
                    axisLine={{ stroke: "var(--card-divider)" }}
                    tickLine={{ stroke: "var(--card-divider)" }}
                  />
                  <Tooltip
                    content={<BarTooltip />}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar
                    dataKey="value"
                    name="Jumlah"
                    radius={[4, 4, 0, 0]}
                  >
                    {(tonerData?.byStatus ?? []).map((entry: any) => (
                      <Cell
                        key={entry.name}
                        fill={tonerStatusColors[entry.name] || "#CBD5E1"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent Activity Trends - Material Design Style */}
          {/* <Card
            title="Recent Activity Trends"
            right="Last 7 days"
            style={{ minHeight: 320 }}
          >
            <div style={{ height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activityTrends}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E0E0E0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={{ stroke: "#E0E0E0" }}
                    tickLine={false}
                    tick={{
                      fill: "#7B809A",
                      fontSize: 11,
                      fontWeight: 500
                    }}
                  />
                  <YAxis
                    axisLine={{ stroke: "#E0E0E0" }}
                    tickLine={false}
                    tick={{
                      fill: "#7B809A",
                      fontSize: 11,
                      fontWeight: 500
                    }}
                  />
                  <Tooltip
                    content={<MaterialTooltip />}
                    cursor={{ strokeDasharray: '3 3', stroke: '#E0E0E0' }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#7B809A",
                    }}
                    iconSize={8}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="assets"
                    name="Assets"
                    stroke={activityColors.assets}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: activityColors.assets,
                      fill: "#FFFFFF"
                    }}
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                      fill: activityColors.assets
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inventory"
                    name="Inventory"
                    stroke={activityColors.inventory}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: activityColors.inventory,
                      fill: "#FFFFFF"
                    }}
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                      fill: activityColors.inventory
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="toner"
                    name="Toner"
                    stroke={activityColors.toner}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: activityColors.toner,
                      fill: "#FFFFFF"
                    }}
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                      fill: activityColors.toner
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card> */}
        </div>

        {/* Tables Grid - 3 columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
          opacity: loading ? 0.6 : 1,
          marginBottom: 28
        }}>
          {/* Recent Assets */}
          <Card
            title="Recent Assets"
            right={`${safeRecentAssets.length} items`}
          >
            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}>
                <thead>
                  <tr style={{
                    textAlign: "left",
                    color: "var(--text-2)",
                    fontSize: 11,
                    borderBottom: "1px solid var(--card-divider)",
                  }}>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Asset Tag</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Nama</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeRecentAssets.slice(0, 6).map((a) => {
                    const tone =
                      a.status === "IN_USE"
                        ? "green"
                        : a.status === "IN_STOCK"
                          ? "blue"
                          : a.status === "REPAIR"
                            ? "amber"
                            : a.status === "RETIRED"
                              ? "gray"
                              : "gray";

                    return (
                      <tr
                        key={a.id}
                        style={{
                          transition: "background 120ms ease",
                          borderBottom: "1px solid var(--card-divider)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{
                          padding: "12px",
                          fontWeight: 600,
                          color: "var(--text-1)",
                          fontFamily: "'SF Mono', monospace",
                          fontSize: 12
                        }}>
                          {a.assetTag}
                        </td>
                        <td style={{
                          padding: "12px",
                          color: "var(--text-1)",
                          fontWeight: 500,
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {a.name}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <Pill label={a.status.replace('_', ' ')} tone={tone as any} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {safeRecentAssets.length === 0 ? (
                <div style={{
                  marginTop: 16,
                  color: "var(--text-3)",
                  fontWeight: 500,
                  fontSize: 13,
                  textAlign: "center",
                  padding: "20px 0"
                }}>
                  Belum ada data aset.
                </div>
              ) : null}
            </div>
          </Card>

          {/* Low Stock Inventory */}
          <Card
            title="Low Stock Inventory"
            right={`${safeLowStockList.length} items`}
          >
            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}>
                <thead>
                  <tr style={{
                    textAlign: "left",
                    color: "var(--text-2)",
                    fontSize: 11,
                    borderBottom: "1px solid var(--card-divider)",
                  }}>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>SKU</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Item</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {safeLowStockList.slice(0, 6).map((i) => (
                    <tr
                      key={i.id}
                      style={{
                        transition: "background 120ms ease",
                        borderBottom: "1px solid var(--card-divider)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{
                        padding: "12px",
                        fontWeight: 600,
                        color: "var(--text-1)",
                        fontFamily: "'SF Mono', monospace",
                        fontSize: 12
                      }}>
                        {i.sku}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: "var(--text-1)",
                        fontWeight: 500,
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {i.name}
                      </td>
                      <td style={{
                        padding: "12px",
                        color: "var(--text-1)",
                        fontWeight: 600,
                        fontSize: 13
                      }}>
                        <span style={{
                          color: i.stock === 0 ? "#EF4444" : "#F59E0B",
                          fontVariantNumeric: "tabular-nums"
                        }}>
                          {fmtInt(i.stock)}
                        </span>
                        <span style={{
                          color: "var(--text-3)",
                          margin: "0 4px",
                          fontWeight: 400
                        }}>/</span>
                        <span style={{
                          color: "var(--text-1)",
                          fontVariantNumeric: "tabular-nums"
                        }}>
                          {fmtInt(i.minStock)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {safeLowStockList.length === 0 ? (
                <div style={{
                  marginTop: 16,
                  color: "#10B981",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "center",
                  padding: "20px 0",
                  background: "#ECFDF5",
                  borderRadius: 6,
                  margin: "16px 0 0 0",
                  border: "1px solid #A7F3D0"
                }}>
                  ✓ Aman — tidak ada item low stock.
                </div>
              ) : null}
            </div>
          </Card>

          {/* Not Finish Toner */}
          <Card
            title="Not Finish Toner"
            right={`${tonerData?.notFinishCount ?? 0} items`}
          >
            <div style={{ overflowY: "auto", maxHeight: 360 }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}>
                <thead>
                  <tr style={{
                    textAlign: "left",
                    color: "var(--text-2)",
                    fontSize: 11,
                    borderBottom: "1px solid var(--card-divider)",
                  }}>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Toner ID</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Name</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Origin</th>
                    <th style={{
                      padding: "10px 12px",
                      fontWeight: 600
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tonerData?.recentNotFinish?.slice(0, 6).map((t: any) => {
                    const tone = t.status === "PENDING" ? "blue" : "amber";
                    return (
                      <tr
                        key={t.id}
                        style={{
                          transition: "background 120ms ease",
                          borderBottom: "1px solid var(--card-divider)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{
                          padding: "12px",
                          fontWeight: 600,
                          color: "var(--text-1)",
                          fontFamily: "'SF Mono', monospace",
                          fontSize: 12
                        }}>
                          {t.tonerSerial}
                        </td>
                        <td style={{
                          padding: "12px",
                          color: "var(--text-1)",
                          fontWeight: 500,
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {t.name}
                        </td>
                        <td style={{
                          padding: "12px",
                          color: "var(--text-1)",
                          fontWeight: 500,
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {t.origin}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <Pill label={t.status.replace('_', ' ')} tone={tone} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!tonerData?.recentNotFinish || tonerData.recentNotFinish.length === 0) ? (
                <div style={{
                  marginTop: 16,
                  color: "#10B981",
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: "center",
                  padding: "20px 0",
                  background: "#ECFDF5",
                  borderRadius: 6,
                  margin: "16px 0 0 0",
                  border: "1px solid #A7F3D0"
                }}>
                  ✓ Semua toner sudah finish.
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </AppLayout>
  );
}