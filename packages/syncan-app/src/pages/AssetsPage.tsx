import React, { useEffect, useMemo, useState, useRef } from "react";
import AppLayout from "../layouts/AppLayout";
import { isAdmin } from "../auth/auth";
import {
  createAsset,
  listAssets,
  updateAsset,
  disableAsset,
  restoreAsset,
  retireAsset,
  createAssetHandover,
  type Asset,
  type AssetStatus,
  type AssetType,
} from "../services/itService";
import AssetHistoryModal from "../components/AssetHistoryModal";
import { useToast } from "../components/ToastProvider";

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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  React.useEffect(() => {
    function onResize() {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth <= breakpoint);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
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

    ["--input-bg" as any]: dark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
    ["--input-border" as any]: dark ? "rgba(255,255,255,0.18)" : "#E2E8F0",

    ["--menu-bg" as any]: dark ? "#2B313D" : "#FFFFFF",
    ["--menu-border" as any]: dark ? "rgba(255,255,255,0.18)" : "#E2E8F0",
    ["--menu-shadow" as any]: dark ? "0 18px 40px rgba(0,0,0,0.55)" : "0 12px 28px rgba(0,0,0,0.12)",

    ["--table-border" as any]: dark ? "rgba(255,255,255,0.12)" : "#F1F5F9",

    ["--btn-ghost-bg" as any]: dark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
    ["--btn-ghost-border" as any]: dark ? "rgba(255,255,255,0.20)" : "#E2E8F0",
    ["--btn-ghost-text" as any]: dark ? "rgba(255,255,255,0.92)" : "#0F172A",
  } as React.CSSProperties;
}

function IconCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        color: "var(--muted)",
        fontWeight: 900,
        fontSize: 22,
        width: 40,
        height: 40,
        borderRadius: 999,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--hover-1)";
        e.currentTarget.style.color = "var(--text-1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--muted)";
      }}
    >
      ×
    </button>
  );
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        borderRadius: 14,
        boxShadow: "var(--card-shadow)",
        border: "1px solid var(--card-border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--card-divider)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900, color: "var(--text-1)" }}>{title}</div>
        <div>{right}</div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--input-border)",
    outline: "none",
    fontWeight: 800,
    boxSizing: "border-box",
    background: "var(--input-bg)",
    color: "var(--text-1)",
    height: 42,
    lineHeight: "20px",
  };
}

function DropdownSelect<T extends string>({
  value,
  onChange,
  options,
  style,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; subLabel?: string }>;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div style={{ position: "relative", width: (style?.width as any) ?? "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          ...inputStyle(),
          paddingRight: 42,
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          ...style,
        }}
      >
        {selected?.label ?? String(value)}
        <span
          style={{
            position: "absolute",
            right: 12,
            top: 11,
            color: "var(--muted)",
            fontWeight: 900,
            pointerEvents: "none",
          }}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            background: "var(--menu-bg)",
            borderRadius: 12,
            border: "1px solid var(--menu-border)",
            boxShadow: "var(--menu-shadow)",
            zIndex: 60,
            overflow: "hidden",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <div
                key={String(o.value)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--card-divider)",
                  background: isSelected ? "var(--hover-1)" : "var(--menu-bg)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-1)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isSelected ? "var(--hover-1)" : "var(--menu-bg)")
                }
              >
                <div style={{ fontWeight: 900, color: "var(--text-1)" }}>{o.label}</div>
                {o.subLabel ? (
                  <div style={{ color: "var(--text-2)", fontWeight: 800, fontSize: 12 }}>
                    {o.subLabel}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AutocompleteTextInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const filtered = React.useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);

  React.useEffect(() => {
    setActiveIndex(filtered.length ? 0 : -1);
  }, [value, filtered.length]);

  // Alternatif: gunakan click event
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    // Gunakan click bukan mousedown
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  function scrollActiveIntoView(nextIndex: number) {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLDivElement>(`[data-idx="${nextIndex}"]`);
    if (!el) return;

    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;

    if (elTop < viewTop) list.scrollTop = elTop;
    else if (elBottom > viewBottom) list.scrollTop = elBottom - list.clientHeight;
  }

  function commit(val: string) {
    onChange(val);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" && filtered.length) {
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min((i < 0 ? 0 : i + 1), filtered.length - 1);
        scrollActiveIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, 0);
        scrollActiveIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        commit(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        disabled={disabled}
        style={inputStyle()}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {open && !disabled && filtered.length ? (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            background: "var(--menu-bg)",
            borderRadius: 12,
            border: "1px solid var(--menu-border)",
            boxShadow: "var(--menu-shadow)",
            zIndex: 70,
            overflow: "hidden",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {filtered.map((opt, idx) => {
            const active = idx === activeIndex;
            return (
              <div
                key={opt + idx}
                data-idx={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  commit(opt);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--card-divider)",
                  background: active ? "var(--hover-1)" : "var(--menu-bg)",
                  fontWeight: 900,
                  color: "var(--text-1)",
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {opt}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function buttonStyle(
  variant: "primary" | "ghost" | "danger" | "warning" = "ghost"
): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 900,
    boxSizing: "border-box",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  if (variant === "primary") {
    return {
      ...base,
      border: "1px solid #0EA5E9",
      background: "#0EA5E9",
      color: "#fff",
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      border: "1px solid #FCA5A5",
      background: "#FEF2F2",
      color: "#B91C1C",
    };
  }
  if (variant === "warning") {
    return {
      ...base,
      border: "1px solid #F59E0B",
      background: "#FFFBEB",
      color: "#B45309",
    };
  }
  return {
    ...base,
    border: "1px solid var(--btn-ghost-border)",
    background: "var(--btn-ghost-bg)",
    color: "var(--btn-ghost-text)",
  };
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blue" | "amber" | "gray";
}) {
  const map = {
    green: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
    blue: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
    amber: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
    gray: { bg: "#F8FAFC", fg: "#475569", bd: "#E2E8F0" },
  } as const;

  const t = map[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.fg,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: "var(--text-2)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

type FormState = {
  id?: string;
  assetTag: string;
  name: string;
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  assignedTo: string;
  location: string;
  purchaseDate: string;
  warrantyEnd: string;
  notes: string;

  // spesifikasi PC/Laptop
  specCpu: string;
  specRam: string;
  specHdd: string;
  vgaCard: string;

  // checklist kelengkapan (hanya dipakai untuk LAPTOP)
  ckUsbLan: boolean;
  ckMouse: boolean;
  ckTas: boolean;
  ckKeyboard: boolean;
  ckUsbHub: boolean;

  monitorType: string;
  storageType: string;
};


const defaultForm: FormState = {
  id: undefined,
  assetTag: "",
  name: "",
  type: "OTHER",
  brand: "",
  model: "",
  serialNumber: "",
  status: "IN_STOCK",
  assignedTo: "",
  location: "",
  purchaseDate: "",
  warrantyEnd: "",
  notes: "",

  specCpu: "",
  specRam: "",
  specHdd: "",
  vgaCard: "",
  ckUsbLan: false,
  ckMouse: false,
  ckTas: false,
  ckKeyboard: false,
  ckUsbHub: false,

  monitorType: "",
  storageType: "",
};


export default function AssetsPage() {
  const theme = useSyncanTheme();

  const canWrite = isAdmin();
  const toast = useToast();

  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const [type, setType] = useState<AssetType | "">("");
  const [location, setLocation] = useState("");
  // const [allLocations, setAllLocations] = useState<string[]>([]);

  const [allAssetsData, setAllAssetsData] = useState<Asset[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  const [historyAsset, setHistoryAsset] = useState<{ id: string; name: string } | null>(null);

  const [handoverTarget, setHandoverTarget] = useState<Asset | null>(null);
  const [handoverForm, setHandoverForm] = useState({
    receiverName: "",
    receiverDivision: "",
    receiverPhone: "",
    handoverDate: "",
  });
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [active, setActive] = useState<"1" | "0" | "all">("1");

  const isLaptop = (form.type || "").toUpperCase() === "LAPTOP";
  const isPcOrLaptop = ["PC", "LAPTOP"].includes((form.type || "").toUpperCase());
  const isMobile = useIsMobile();

  async function reload() {
    setLoading(true);
    try {
      const data = await listAssets({ search, status, type, location, active });
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Gagal load assets");
    } finally {
      setLoading(false);
    }
  }

  // Fungsi untuk load SEMUA data assets (tidak difilter)
  async function loadAllAssetsData() {
    if (loadingAll) return;

    setLoadingAll(true);
    try {
      // Ambil SEMUA data assets tanpa filter
      const allData = await listAssets({
        active: "all",
        search: "",
        status: "",
        type: "",
        location: ""
      });
      setAllAssetsData(allData);
    } catch (e: any) {
      console.error("Gagal load semua data assets untuk autocomplete:", e);
      // Fallback ke data yang sudah difilter
      setAllAssetsData(items);
    } finally {
      setLoadingAll(false);
    }
  }

  // ===== SORT (ADD) =====
  type SortDir = "asc" | "desc";
  type SortKey =
    | "assetTag"
    | "name"
    | "type"
    | "model"
    | "owner"
    | "location"
    | "status";

  const [sortKey, setSortKey] = useState<SortKey>("assetTag");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  function cmp(a: any, b: any) {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return 1;
    return String(a).localeCompare(String(b), "id", { sensitivity: "base" });
  }
  // ======================

  function normUpper(s: string) {
    return (s || "").trim().toUpperCase();
  }

  function normalizeDateInput(v?: string | null): string {
    if (!v) return "";
    const s = String(v).trim();
    if (!s) return "";
    // ambil hanya bagian YYYY-MM-DD
    return s.slice(0, 10);
  }

  function parseAssetNotes(raw: string) {
    const upper = (raw || "").toUpperCase();

    const specCpuMatch = upper.match(/\[SPEC_CPU\]=([^\[]*)/);
    const specRamMatch = upper.match(/\[SPEC_RAM\]=([^\[]*)/);
    const specHddMatch = upper.match(/\[SPEC_HDD\]=([^\[]*)/);

    const ckUsbLan = upper.includes("[CHK_USB_LAN]");
    const ckMouse = upper.includes("[CHK_MOUSE]");
    const ckTas = upper.includes("[CHK_TAS]");
    const ckKeyboard = upper.includes("[CHK_KEYBOARD]");
    const ckUsbHub = upper.includes("[CHK_USB_HUB]");

    const monitorTypeMatch = upper.match(/\[MONITOR_TYPE\]=([^\[]*)/);
    const storageTypeMatch = upper.match(/\[STORAGE_TYPE\]=([^\[]*)/);

    let cleaned = upper
      .replace(/\[SPEC_CPU\]=[^\[]*/g, "")
      .replace(/\[SPEC_RAM\]=[^\[]*/g, "")
      .replace(/\[SPEC_HDD\]=[^\[]*/g, "")
      .replace(/\[CHK_USB_LAN\]/g, "")
      .replace(/\[CHK_MOUSE\]/g, "")
      .replace(/\[CHK_TAS\]/g, "")
      .replace(/\[CHK_KEYBOARD\]/g, "")
      .replace(/\[CHK_USB_HUB\]/g, "")
      .replace(/\[MONITOR_TYPE\]=[^\[]*/g, "")
      .replace(/\[STORAGE_TYPE\]=[^\[]*/g, "");

    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

    return {
      notesText: cleaned,
      specCpu: (specCpuMatch?.[1] || "").trim(),
      specRam: (specRamMatch?.[1] || "").trim(),
      specHdd: (specHddMatch?.[1] || "").trim(),
      ckUsbLan,
      ckMouse,
      ckTas,
      ckKeyboard,
      ckUsbHub,
      monitorType: (monitorTypeMatch?.[1] || "").trim(),
      storageType: (storageTypeMatch?.[1] || "").trim(),
    };
  }


  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, type, location, active]);

  // Load semua data untuk autocomplete saat pertama kali
  useEffect(() => {
    loadAllAssetsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh semua data saat modal ditutup
  useEffect(() => {
    if (!formOpen) {
      loadAllAssetsData();
    }
  }, [formOpen]);

  // useEffect(() => {
  //   async function loadAllLocations() {
  //     try {
  //       const data = await listAssets({ active: "all" }); // Ambil semua, termasuk disabled
  //       const set = new Set<string>();
  //       for (const it of data) if (it.location) set.add(it.location);
  //       setAllLocations(Array.from(set).sort((a, b) => a.localeCompare(b)));
  //     } catch (e) {
  //       console.error("Failed to load locations:", e);
  //     }
  //   }
  //   loadAllLocations();
  // }, []);

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) if (it.location) set.add(it.location);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) if (it.brand) set.add(it.brand);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) if (it.model) set.add(it.model);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const cpuOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) {
      const v = (it.cpuSpec || "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const ramOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) {
      const v = (it.ramSpec || "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const hddOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) {
      const v = (it.hddSpec || "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const storageTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) {
      const v = (it.storageType || "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const vgaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) {
      const v = (it.vgaCard || "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  const monitorTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of allAssetsData) {
      const v = (it.monitorType || "").trim();
      if (v) set.add(v.toUpperCase());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAssetsData]);

  // Data untuk filter di tabel (masih menggunakan items yang difilter)
  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.location) set.add(it.location);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // ===== SORTED ASSETS (ADD) =====
  const sortedAssets = useMemo(() => {
    const arr = [...items];

    arr.sort((x: any, y: any) => {
      const ax =
        sortKey === "assetTag"
          ? x.assetTag
          : sortKey === "name"
            ? x.name
            : sortKey === "type"
              ? x.type
              : sortKey === "model"
                ? (x.model || "")
                : sortKey === "owner"
                  ? (x.assignedTo || "")
                  : sortKey === "location"
                    ? (x.location || "")
                    : (x.status || "");

      const ay =
        sortKey === "assetTag"
          ? y.assetTag
          : sortKey === "name"
            ? y.name
            : sortKey === "type"
              ? y.type
              : sortKey === "model"
                ? (y.model || "")
                : sortKey === "owner"
                  ? (y.assignedTo || "")
                  : sortKey === "location"
                    ? (y.location || "")
                    : (y.status || "");

      const r = cmp(ax, ay);
      return sortDir === "asc" ? r : -r;
    });

    return arr;
  }, [items, sortKey, sortDir]);
  // =============================

  // ===== PAGINATION (ADD) =====
  useEffect(() => {
    setPage(1);
  }, [search, status, type, location, active, pageSize]);

  const total = sortedAssets.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pagedAssets = sortedAssets.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  // ============================

  function openAdd() {
    setForm({
      ...defaultForm,
      assetTag: "",
    });
    setFormOpen(true);
  }

  function openEdit(a: Asset) {
    const parsed = parseAssetNotes(a.notes || "");
    setForm({
      id: a.id,
      assetTag: (a.assetTag || "").toUpperCase(),
      name: (a.name || "").toUpperCase(),
      type: a.type,
      brand: (a.brand || "").toUpperCase(),
      model: (a.model || "").toUpperCase(),
      serialNumber: (a.serialNumber || "").toUpperCase(),
      status: a.status,
      assignedTo: (a.assignedTo || "").toUpperCase(),
      location: (a.location || "").toUpperCase(),
      purchaseDate: normalizeDateInput(a.purchaseDate),
      warrantyEnd: normalizeDateInput(a.warrantyEnd),
      notes: (a.notes || "").toUpperCase(),

      specCpu: (a.cpuSpec || "").toUpperCase(),
      specRam: (a.ramSpec || "").toUpperCase(),
      specHdd: (a.hddSpec || "").toUpperCase(),
      vgaCard: (a.vgaCard || "").toUpperCase(),

      ckUsbLan: !!a.ckUsbLan,
      ckMouse: !!a.ckMouse,
      ckTas: !!a.ckTas,
      ckKeyboard: !!a.ckKeyboard,
      ckUsbHub: !!a.ckUsbHub,

      monitorType: (a.monitorType || "").toUpperCase(),
      storageType: (a.storageType || "").toUpperCase(),
    });
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    if (e) {
      e.preventDefault();
    }

    const payload: Partial<Asset> = {
      assetTag: normUpper(form.assetTag),
      name: normUpper(form.name),
      type: form.type,
      brand: normUpper(form.brand),
      model: normUpper(form.model),
      serialNumber: normUpper(form.serialNumber),
      status: form.status,
      assignedTo: normUpper(form.assignedTo),
      location: normUpper(form.location),
      purchaseDate: (form.purchaseDate || "").trim(),
      warrantyEnd: (form.warrantyEnd || "").trim(),
      notes: normUpper(form.notes),

      cpuSpec: normUpper(form.specCpu),
      ramSpec: normUpper(form.specRam),
      hddSpec: normUpper(form.specHdd),
      vgaCard: normUpper(form.vgaCard),

      ckUsbLan: form.ckUsbLan ? 1 : 0,
      ckMouse: form.ckMouse ? 1 : 0,
      ckTas: form.ckTas ? 1 : 0,
      ckKeyboard: form.ckKeyboard ? 1 : 0,
      ckUsbHub: form.ckUsbHub ? 1 : 0,

      monitorType: normUpper(form.monitorType),
      storageType: normUpper(form.storageType),
    };

    try {
      if (!payload.name) {
        toast.error("Nama wajib diisi");
        return;
      }

      if (!payload.location) {
        toast.error("Location wajib diisi");
        return;
      }

      if (!payload.assignedTo) {
        toast.error("Assigned To wajib diisi");
        return;
      }

      if (form.id) {
        await updateAsset(form.id, payload);
        toast.success("Asset berhasil disimpan");
      } else {
        await createAsset(payload);
        toast.success("Asset berhasil ditambahkan");
      }

      setFormOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal simpan");
    }
  }

  async function onDisable(a: Asset) {
    if (!canWrite) return;

    const reason = window.prompt(`Alasan nonaktifkan asset ${a.assetTag} - ${a.name}?`);
    if (!reason || !reason.trim()) return;

    try {
      await disableAsset(a.id, { reason: reason.trim() });
      toast.success("Asset berhasil dinonaktifkan");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal nonaktifkan asset");
    }
  }

  async function onRestore(a: Asset) {
    if (!canWrite) return;

    try {
      await restoreAsset(a.id);
      toast.success("Asset berhasil diaktifkan kembali");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal restore asset");
    }
  }

  async function onRetire(a: Asset) {
    if (!canWrite) return;

    const reason = window.prompt(
      `Alasan retire asset ${a.assetTag} - ${a.name}? (misal: rusak, usang, upgrade)`
    );
    if (reason === null) return; // batal
    if (!reason.trim()) {
      toast.error("Alasan wajib diisi");
      return;
    }

    const physicalCondition = window.prompt(
      `Kondisi fisik barangnya seperti apa? (misal: "Masih Bagus", "Rusak Ringan", "Rusak Berat", "Mati Total", "Dikanibal", "Hilang/Tidak Lengkap")`
    );
    if (physicalCondition === null) return; // batal
    if (!physicalCondition.trim()) {
      toast.error("Kondisi fisik wajib diisi");
      return;
    }

    const physicalLocation = window.prompt(
      `Barangnya sekarang ada di mana? (misal: "Ruang Server Baki", "Almari IT", "Sudah Dibuang")`
    );
    if (physicalLocation === null) return; // batal
    if (!physicalLocation.trim()) {
      toast.error("Lokasi fisik wajib diisi");
      return;
    }

    if (!window.confirm(`Pindahkan ${a.assetTag} - ${a.name} ke Trash?`)) return;

    try {
      await retireAsset(a.id, {
        reason: reason.trim().toUpperCase(),
        physicalCondition: physicalCondition.trim().toUpperCase(),
        physicalLocation: physicalLocation.trim().toUpperCase(),
      });
      toast.success("Asset dipindahkan ke Trash");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal memindahkan asset ke Trash");
    }
  }

  function openHandoverModal(a: Asset) {
    setHandoverTarget(a);
    setHandoverForm({
      receiverName: "",
      receiverDivision: "",
      receiverPhone: "",
      handoverDate: new Date().toISOString().slice(0, 10),
    });
  }

  function buildHandoverPrintHtml(data: {
    handoverNumber: string;
    handoverDate: string;
    receiverName: string;
    receiverDivision: string;
    receiverPhone: string;
    handedOverBy: string;
    asset: { assetTag?: string; name?: string; type?: string; brand?: string; model?: string; serialNumber?: string };
  }): string {
    const tglIndo = (() => {
      const d = new Date(data.handoverDate);
      if (isNaN(d.getTime())) return data.handoverDate;
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    })();

    const a = data.asset;

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>${data.handoverNumber}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 13px; margin: 0; padding: 0; }
  .title { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
  .subtitle { text-align: center; font-size: 13px; font-weight: 700; margin-bottom: 24px; }
  .meta-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
  .meta-table td { padding: 3px 0; vertical-align: top; }
  .meta-table td.label { width: 160px; font-weight: 700; }
  .meta-table td.colon { width: 14px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 30px; }
  table.items th, table.items td { border: 1px solid #111827; padding: 8px; font-size: 12px; text-align: left; }
  table.items th { background: #F3F4F6; font-weight: 700; text-transform: uppercase; }
  .statement { margin: 18px 0; font-size: 13px; line-height: 1.6; }
  .sign-wrap { display: flex; justify-content: space-between; margin-top: 50px; }
  .sign-box { width: 45%; text-align: center; }
  .sign-space { height: 70px; }
  .sign-name { border-top: 1px solid #111827; padding-top: 6px; font-weight: 700; display: inline-block; min-width: 200px; }
  .sign-label { font-weight: 700; margin-bottom: 4px; }
  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="title">Surat Tanda Terima Asset</div>
  <div class="subtitle">Nomor: ${data.handoverNumber}</div>

  <table class="meta-table">
    <tr><td class="label">Tanggal</td><td class="colon">:</td><td>${tglIndo}</td></tr>
    <tr><td class="label">Nama Penerima</td><td class="colon">:</td><td>${data.receiverName}</td></tr>
    <tr><td class="label">Divisi Penerima</td><td class="colon">:</td><td>${data.receiverDivision}</td></tr>
    <tr><td class="label">No. WA Penerima</td><td class="colon">:</td><td>${data.receiverPhone}</td></tr>
  </table>

  <div class="statement">
    Dengan ini menyatakan telah terjadi serah terima asset IT dengan rincian sebagai berikut:
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:32px;">No</th>
        <th>Asset Tag</th>
        <th>Nama Asset</th>
        <th>Tipe</th>
        <th>Merk / Model</th>
        <th>Serial Number</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${a.assetTag || "-"}</td>
        <td>${a.name || "-"}</td>
        <td>${a.type || "-"}</td>
        <td>${[a.brand, a.model].filter(Boolean).join(" / ") || "-"}</td>
        <td>${a.serialNumber || "-"}</td>
      </tr>
    </tbody>
  </table>

  <div class="sign-wrap">
    <div class="sign-box">
      <div class="sign-label">Yang Menyerahkan,</div>
      <div class="sign-space"></div>
      <div class="sign-name">${data.handedOverBy || "-"}</div>
    </div>
    <div class="sign-box">
      <div class="sign-label">Yang Menerima,</div>
      <div class="sign-space"></div>
      <div class="sign-name">${data.receiverName || "-"}</div>
    </div>
  </div>
</body>
</html>`;
  }

  function openPrintWindow(html: string) {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup diblokir browser. Izinkan popup untuk print Serah Terima.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        // ignore
      }
    }, 400);
  }

  // Print ulang dokumen serah terima yang SUDAH PERNAH dibuat (tanpa generate baru)
  function printExistingHandover(a: Asset) {
    if (!a.lastHandoverNumber) return;
    const html = buildHandoverPrintHtml({
      handoverNumber: a.lastHandoverNumber,
      handoverDate: a.lastHandoverDate || "",
      receiverName: a.lastHandoverReceiverName || "-",
      receiverDivision: a.lastHandoverReceiverDivision || "-",
      receiverPhone: a.lastHandoverReceiverPhone || "-",
      handedOverBy: a.lastHandoverBy || "-",
      asset: a,
    });
    openPrintWindow(html);
  }

  async function submitHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!handoverTarget) return;

    if (!handoverForm.receiverName.trim()) {
      toast.error("Nama penerima wajib diisi");
      return;
    }
    if (!handoverForm.receiverDivision.trim()) {
      toast.error("Divisi penerima wajib diisi");
      return;
    }
    if (!handoverForm.receiverPhone.trim()) {
      toast.error("No WA penerima wajib diisi");
      return;
    }

    if (!window.confirm(`Generate nomor Serah Terima untuk ${handoverTarget.assetTag} - ${handoverTarget.name}? Nomor tidak bisa diulang/dibatalkan setelah dibuat.`)) {
      return;
    }

    setHandoverSubmitting(true);
    try {
      const result = await createAssetHandover(handoverTarget.id, {
        receiverName: handoverForm.receiverName.trim(),
        receiverDivision: handoverForm.receiverDivision.trim(),
        receiverPhone: handoverForm.receiverPhone.trim(),
        handoverDate: handoverForm.handoverDate || undefined,
      });

      const html = buildHandoverPrintHtml(result);
      openPrintWindow(html);

      toast.success(`Serah Terima ${result.handoverNumber} berhasil dibuat`);
      setHandoverTarget(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal membuat Serah Terima");
    } finally {
      setHandoverSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div style={useThemeVars(theme)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
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
              {" > Assets"}
            </div>
            <div style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.02em"
            }}>
              Assets
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={buttonStyle()} onClick={reload}>
              ↻ Refresh
            </button>
            {canWrite ? (
              <button style={buttonStyle("primary")} onClick={openAdd}>
                + Add Asset
              </button>
            ) : null}
          </div>
        </div>

        <Card
          title="Assets List"
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                style={{ ...inputStyle(), width: 240 }}
                placeholder="Search assetTag / name / model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") reload();
                }}
              />

              <div style={{ minWidth: 170 }}>
                <DropdownSelect
                  value={active}
                  onChange={(v) => setActive(v)}
                  options={[
                    { value: "1", label: "ACTIVE" },
                    { value: "0", label: "DISABLED" },
                    { value: "all", label: "ALL" },
                  ]}
                />
              </div>

              <DropdownSelect
                value={status as any}
                onChange={(v) => setStatus(v as any)}
                options={[
                  { value: "" as any, label: "All Status" },
                  { value: "IN_USE" as any, label: "IN_USE" },
                  { value: "IN_STOCK" as any, label: "IN_STOCK" },
                  { value: "REPAIR" as any, label: "REPAIR" },
                  { value: "RETIRED" as any, label: "RETIRED" },
                ]}
                style={{ width: 170 }}
              />

              <DropdownSelect
                value={type as any}
                onChange={(v) => setType(v as any)}
                options={[
                  { value: "" as any, label: "All Type" },
                  { value: "PC" as any, label: "PC" },
                  { value: "LAPTOP" as any, label: "LAPTOP" },
                  { value: "SERVER" as any, label: "SERVER" },
                  { value: "NETWORK" as any, label: "NETWORK" },
                  { value: "PRINTER" as any, label: "PRINTER" },
                  { value: "OTHER" as any, label: "OTHER" },
                ]}
                style={{ width: 170 }}
              />

              <div style={{ width: 190 }}>
                <AutocompleteTextInput
                  value={location}
                  onChange={(v) => setLocation(v)}
                  options={locations} // Masih menggunakan data yang difilter untuk tabel
                  placeholder="All Location"
                />
              </div>

              {location ? (
                <button
                  type="button"
                  style={buttonStyle()}
                  onClick={() => setLocation("")}
                  title="Clear location"
                >
                  Clear
                </button>
              ) : null}

              <button style={buttonStyle("primary")} onClick={reload}>
                Filter
              </button>
            </div>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort("assetTag")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Asset Tag <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("assetTag")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("name")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Name <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("name")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("type")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Type <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("type")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("model")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Model <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("model")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("owner")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Assigned to <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("owner")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("location")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Location <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("location")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("status")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Status <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("status")}</span>
                  </th>

                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {pagedAssets.map((a) => {
                  const tone =
                    a.status === "IN_USE"
                      ? "green"
                      : a.status === "IN_STOCK"
                        ? "blue"
                        : a.status === "REPAIR"
                          ? "amber"
                          : "gray";

                  const isDisabled = (a as any).isActive === 0;

                  return (
                    <tr
                      key={a.id}
                      style={{ transition: "background 120ms ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-1)" }}>
                        {(a.assetTag || "").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                        {(a.name || "").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        {a.type}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        {(a.model || "").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        {(a.assignedTo || "-").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        {(a.location || "-").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        <Pill label={a.status} tone={tone as any} />
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {canWrite ? (
                            <>
                              <button style={buttonStyle()} onClick={() => openEdit(a)}>
                                EDIT
                              </button>
                              <button style={buttonStyle()} onClick={() => setHistoryAsset({ id: a.id, name: a.name })}>
                                HISTORY
                              </button>
                            </>
                          ) : (
                            <span style={{ color: "var(--muted)", fontWeight: 800 }}>READ ONLY</span>
                          )}

                          {canWrite ? (
                            isDisabled ? (
                              <button style={buttonStyle("primary")} onClick={() => onRestore(a)}>RESTORE</button>
                            ) : (
                              <button style={buttonStyle("danger")} onClick={() => onDisable(a)}>DISABLE</button>
                            )
                          ) : null}

                          {canWrite && a.status !== "RETIRED" ? (
                            <button style={buttonStyle("danger")} onClick={() => onRetire(a)}>TRASH</button>
                          ) : null}

                          {canWrite && a.status !== "RETIRED" ? (
                            a.lastHandoverNumber ? (
                              <>
                                <button style={buttonStyle("warning")} onClick={() => printExistingHandover(a)}>PRINT</button>
                                <button style={buttonStyle("warning")} onClick={() => openHandoverModal(a)}>GENERATE ULANG</button>
                              </>
                            ) : (
                              <button style={buttonStyle("warning")} onClick={() => openHandoverModal(a)}>PRINT</button>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-2)" }}>
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    height: 36,
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--input-border)",
                    fontWeight: 900,
                    background: "var(--card-bg)",
                    cursor: "pointer",
                    color: "var(--text-2)"
                  }}
                >
                  {[10, 20, 30, 40, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ ...buttonStyle("ghost"), opacity: page <= 1 ? 0.5 : 1 }}
                >
                  Prev
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ ...buttonStyle("ghost"), opacity: page >= totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ marginTop: 10, color: "var(--text-2)", fontWeight: 800 }}>Loading...</div>
            ) : items.length === 0 ? (
              <div style={{ marginTop: 10, color: "var(--muted)", fontWeight: 800 }}>Tidak ada data.</div>
            ) : null}
          </div>
        </Card>

        {/* Add/Edit Modal */}
        {formOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 999,
            }}
          // onMouseDown={() => setFormOpen(false)}
          >
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: 14,
                width: "min(900px, 100%)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                // maxHeight: "min(86vh, 860px)",
                // overflow: "auto",
                // boxSizing: "border-box",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid var(--card-divider)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                  {form.id ? "EDIT ASSET" : "ADD ASSET"}
                </div>
                <IconCloseButton onClick={() => setFormOpen(false)} />
              </div>

              <form
                onSubmit={submitForm}
                style={{
                  padding: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Asset Tag">
                    <input
                      style={{
                        ...inputStyle(),
                        background: "var(--hover-1)",
                        cursor: "not-allowed",
                        color: "var(--muted)",
                        fontWeight: 900,
                      }}
                      value={form.assetTag}
                      readOnly
                      disabled
                      title="Asset Tag akan digenerate otomatis"
                      placeholder="Auto Generated"
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 8" }}>
                  <Field label="Name">
                    <input
                      style={inputStyle()}
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Type">
                    <DropdownSelect
                      value={form.type as any}
                      onChange={(v) => setForm((p) => ({ ...p, type: v as any }))}
                      options={[
                        { value: "PC" as any, label: "PC" },
                        { value: "LAPTOP" as any, label: "LAPTOP" },
                        { value: "SERVER" as any, label: "SERVER" },
                        { value: "NETWORK" as any, label: "NETWORK" },
                        { value: "PRINTER" as any, label: "PRINTER" },
                        { value: "OTHER" as any, label: "OTHER" },
                      ]}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Status">
                    {form.status === "RETIRED" ? (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--app-border, #e2e8f0)",
                          color: "#94A3B8",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        RETIRED — kelola di halaman Trash
                      </div>
                    ) : (
                      <DropdownSelect
                        value={form.status as any}
                        onChange={(v) => setForm((p) => ({ ...p, status: v as any }))}
                        options={[
                          { value: "IN_USE" as any, label: "IN_USE" },
                          { value: "IN_STOCK" as any, label: "IN_STOCK" },
                          { value: "REPAIR" as any, label: "REPAIR" },
                        ]}
                      />
                    )}
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Location">
                    <AutocompleteTextInput
                      value={form.location}
                      onChange={(v) => setForm((p) => ({ ...p, location: v }))}
                      options={allLocations} // Semua locations
                      placeholder="Location"
                      disabled={!canWrite}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Brand">
                    <AutocompleteTextInput
                      value={form.brand}
                      onChange={(v) => setForm((p) => ({ ...p, brand: v }))}
                      options={brandOptions} // Semua brands
                      placeholder="Brand"
                      disabled={!canWrite}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Model">
                    <AutocompleteTextInput
                      value={form.model}
                      onChange={(v) => setForm((p) => ({ ...p, model: v }))}
                      options={modelOptions} // Semua models
                      placeholder="Model"
                      disabled={!canWrite}
                    />
                  </Field>
                </div>

                {(form.type === "PC" || form.type === "LAPTOP") && (
                  <>
                    <div style={{ gridColumn: "span 4" }}>
                      <Field label="CPU">
                        <AutocompleteTextInput
                          value={form.specCpu}
                          onChange={(v) => setForm((p) => ({ ...p, specCpu: v }))}
                          options={cpuOptions} // Semua CPU
                          placeholder="CPU"
                          disabled={!canWrite}
                        />
                      </Field>
                    </div>

                    <div style={{ gridColumn: "span 4" }}>
                      <Field label="RAM">
                        <AutocompleteTextInput
                          value={form.specRam}
                          onChange={(v) => setForm((p) => ({ ...p, specRam: v }))}
                          options={ramOptions} // Semua RAM
                          placeholder=""
                          disabled={!canWrite}
                        />
                      </Field>
                    </div>

                    <div style={{ gridColumn: "span 4" }}>
                      <Field label="HDD / STORAGE">
                        <AutocompleteTextInput
                          value={form.specHdd}
                          onChange={(v) => setForm((p) => ({ ...p, specHdd: v }))}
                          options={hddOptions} // Semua HDD
                          placeholder=""
                          disabled={!canWrite}
                        />
                      </Field>
                    </div>

                    <div style={{ gridColumn: "span 4" }}>
                      <Field label="STORAGE TYPE">
                        <AutocompleteTextInput
                          value={form.storageType}
                          onChange={(v) => setForm((p) => ({ ...p, storageType: v }))}
                          options={storageTypeOptions} // Semua storage types
                          placeholder=""
                          disabled={!canWrite}
                        />
                      </Field>
                    </div>

                    <div style={{ gridColumn: "span 4" }}>
                      <Field label="VGA Card">
                        <AutocompleteTextInput
                          value={form.vgaCard}
                          onChange={(v) => setForm((p) => ({ ...p, vgaCard: v }))}
                          options={vgaOptions} // Semua VGA
                          placeholder=""
                          disabled={!canWrite}
                        />
                      </Field>
                    </div>

                    <div style={{ gridColumn: "span 4" }}>
                      <Field label="Monitor Type">
                        <AutocompleteTextInput
                          value={form.monitorType}
                          onChange={(v) => setForm((p) => ({ ...p, monitorType: v }))}
                          options={monitorTypeOptions} // Semua monitor types
                          placeholder=""
                          disabled={!canWrite}
                        />
                      </Field>
                    </div>
                  </>
                )}

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Serial Number">
                    <input
                      style={inputStyle()}
                      value={form.serialNumber}
                      onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Assigned To">
                    <input
                      style={inputStyle()}
                      value={form.assignedTo}
                      onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Purchase Date">
                    <input
                      type="date"
                      style={inputStyle()}
                      value={form.purchaseDate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, purchaseDate: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Field label="Warranty End (Opsional)">
                    <input
                      type="date"
                      style={inputStyle()}
                      value={form.warrantyEnd}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, warrantyEnd: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <Field label="Notes">
                    <input
                      style={inputStyle()}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </Field>
                </div>

                {/* Checklist Kelengkapan */}
                {isLaptop && (
                  <div style={{ gridColumn: "span 12" }}>
                    <Field label="Checklist Kelengkapan">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: 12,
                          paddingTop: 6,
                          paddingBottom: 4,
                          overflowX: "auto",
                        }}
                      >
                        {[
                          { key: "ckUsbLan", label: "USB LAN" },
                          { key: "ckMouse", label: "Mouse" },
                          { key: "ckTas", label: "Tas" },
                          { key: "ckKeyboard", label: "Keyboard" },
                          { key: "ckUsbHub", label: "USB Hub" },
                        ].map((item) => {
                          const key = item.key as keyof FormState;
                          const checked = form[key] as unknown as boolean;

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() =>
                                canWrite &&
                                setForm((prev) => ({
                                  ...prev,
                                  [key]: !(prev[key] as unknown as boolean),
                                }))
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--card-divider)",
                                background: "var(--card-bg)",
                                cursor: canWrite ? "pointer" : "default",
                                minWidth: 120,
                                justifyContent: "flex-start",
                                gap: 10,
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color: "var(--text-1)",
                              }}
                            >
                              <span
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 4,
                                  background: checked
                                    ? "rgba(34,197,94,1)" // hijau
                                    : "rgba(148,163,184,0.9)", // abu-abu
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--card-bg)",
                                  fontSize: 14,
                                  boxShadow: checked
                                    ? "0 0 0 2px rgba(34,197,94,0.45)"
                                    : "none",
                                }}
                              >
                                {checked ? "✓" : ""}
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                )}

                <div
                  style={{
                    gridColumn: "span 12",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <button type="button" style={buttonStyle()} onClick={() => setFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={buttonStyle("primary")}>
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <div style={{ height: 8 }} />

        {/* Modal Serah Terima Asset (generate baru / generate ulang) */}
        {handoverTarget ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 999,
            }}
          >
            <div
              style={{ background: "var(--card-bg)", borderRadius: 14, width: "min(520px, 100%)", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid var(--card-divider)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                  SERAH TERIMA — {handoverTarget.assetTag}
                </div>
                <IconCloseButton onClick={() => setHandoverTarget(null)} />
              </div>

              <form onSubmit={submitHandover} style={{ padding: 16, display: "grid", gap: 12 }}>
                <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>
                  {handoverTarget.name} {handoverTarget.brand ? `- ${handoverTarget.brand}` : ""} {handoverTarget.model || ""}
                </div>

                {handoverTarget.lastHandoverNumber ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      color: "#B45309",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Sebelumnya sudah diserahkan ke <b>{handoverTarget.lastHandoverReceiverName}</b> ({handoverTarget.lastHandoverReceiverDivision})
                    {handoverTarget.lastHandoverDate ? ` pada ${String(handoverTarget.lastHandoverDate).slice(0, 10)}` : ""}. Isi data penerima baru di bawah untuk generate nomor Serah Terima baru.
                  </div>
                ) : null}

                <Field label="Tanggal Serah Terima">
                  <input
                    type="date"
                    style={inputStyle()}
                    value={handoverForm.handoverDate}
                    onChange={(e) => setHandoverForm((p) => ({ ...p, handoverDate: e.target.value }))}
                  />
                </Field>

                <Field label="Nama Penerima">
                  <input
                    style={inputStyle()}
                    value={handoverForm.receiverName}
                    onChange={(e) => setHandoverForm((p) => ({ ...p, receiverName: e.target.value }))}
                    placeholder="Nama lengkap penerima"
                  />
                </Field>

                <Field label="Divisi Penerima">
                  <input
                    style={inputStyle()}
                    value={handoverForm.receiverDivision}
                    onChange={(e) => setHandoverForm((p) => ({ ...p, receiverDivision: e.target.value }))}
                    placeholder="misal: Finance, MD, HRD"
                  />
                </Field>

                <Field label="No. WA Penerima">
                  <input
                    style={inputStyle()}
                    value={handoverForm.receiverPhone}
                    onChange={(e) => setHandoverForm((p) => ({ ...p, receiverPhone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                  />
                </Field>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                  <button type="button" style={buttonStyle()} onClick={() => setHandoverTarget(null)} disabled={handoverSubmitting}>
                    Batal
                  </button>
                  <button type="submit" style={buttonStyle("warning")} disabled={handoverSubmitting}>
                    {handoverSubmitting ? "Memproses..." : "Print"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {historyAsset && (
          <AssetHistoryModal
            assetId={historyAsset.id}
            assetName={historyAsset.name}
            onClose={() => setHistoryAsset(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
