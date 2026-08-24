import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { isAdmin } from "../auth/auth";
import {
  createInventoryItem,
  listInventory,
  moveInventory,
  updateInventoryItem,
  disableInventoryItem,
  restoreInventoryItem,
  listAssets,
  fetchInventoryMoveOptions,
  type InventoryCategory,
  type InventoryItem,
  type InventoryMoveType,
} from "../services/itService";
import InventoryHistoryModal from "../components/InventoryHistoryModal";
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
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--input-border)",
    outline: "none",
    fontWeight: 800,
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
  const [active, setActive] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const theme = useSyncanTheme();

  const filtered = React.useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    const base = options
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(base));
    if (!q) return uniq.slice(0, 30);
    return uniq
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, 30);
  }, [options, value]);

  React.useEffect(() => {
    setActive(0);
  }, [value]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", ...style }}>
      <input
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        style={{
          ...inputStyle(),
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((p) => Math.min(p + 1, Math.max(filtered.length - 1, 0)));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((p) => Math.max(p - 1, 0));
          }
          if (e.key === "Enter") {
            if (filtered[active]) {
              e.preventDefault();
              onChange(filtered[active]);
              setOpen(false);
            }
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && filtered.length > 0 ? (
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
            zIndex: 70,
            overflow: "hidden",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {filtered.map((opt, idx) => {
            const isActive = idx === active;
            return (
              <div
                key={`${opt}-${idx}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
                onMouseEnter={() => setActive(idx)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--card-divider)",
                  background: isActive ? "var(--hover-1)" : "var(--menu-bg)",
                  fontWeight: 900,
                  color: "var(--text-1)",
                }}
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

const UNIT_OPTIONS = [
  { value: "PCS", label: "PCS" },
  { value: "UNIT", label: "UNIT" },
  { value: "SET", label: "SET" },
  { value: "BOX", label: "BOX" },
  { value: "PACK", label: "PACK" },
] as const;

const STORAGE_CAPACITY_OPTIONS = [
  "100GB",
  "120GB",
  "128GB",
  "240GB",
  "250GB",
  "256GB",
  "320GB",
  "500GB",
  "512GB",
  "1TB",
  "2TB",
  "4TB",
];

const MEMORY_CAPACITY_OPTIONS = [
  "2GB",
  "4GB",
  "8GB",
  "16GB",
  "32GB",
  "64GB",
  "128GB",
];

function isCapacityCategory(cat: InventoryCategory) {
  return cat === "STORAGE" || cat === "MEMORY";
}

function capacityOptionsByCategory(cat: InventoryCategory) {
  if (cat === "STORAGE") return STORAGE_CAPACITY_OPTIONS;
  if (cat === "MEMORY") return MEMORY_CAPACITY_OPTIONS;
  return [] as string[];
}

function buttonStyle(variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties {
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
    return { ...base, border: "1px solid #0EA5E9", background: "#0EA5E9", color: "#fff" };
  }
  if (variant === "danger") {
    return { ...base, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#B91C1C" };
  }
  return { ...base, border: "1px solid var(--btn-ghost-border)", background: "var(--btn-ghost-bg)", color: "var(--btn-ghost-text)" };
}

function Pill({ label, tone }: { label: string; tone: "green" | "red" | "gray" }) {
  const map = {
    green: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
    red: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
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

function fmtInt(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

function normUpper(s: string) {
  return (s || "").trim().toUpperCase();
}

function Label({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

type FormState = {
  id?: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  location: string;
  capacity: string;
  stock: string;
  minStock: string;
  notes: string;
};

const defaultForm: FormState = {
  sku: "",
  name: "",
  category: "OTHER",
  unit: "PCS",
  location: "",
  capacity: "",
  stock: "0",
  minStock: "1",
  notes: "",
};

export default function InventoryPage() {
  const theme = useSyncanTheme();

  const canWrite = isAdmin();
  const toast = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InventoryCategory | "">("");
  const [location, setLocation] = useState("");

  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [allNames, setAllNames] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<InventoryMoveType>("IN");
  const [moveQty, setMoveQty] = useState("1");
  const [moveRef, setMoveRef] = useState("");
  const [moveAssetId, setMoveAssetId] = useState<string>("");

  // Move extra fields
  const [adjustMode, setAdjustMode] = useState<"PLUS" | "MINUS">("PLUS");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseLocation, setPurchaseLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [purchaseLocationOptions, setPurchaseLocationOptions] = useState<string[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);

  const [assetsForMove, setAssetsForMove] = useState<{ id: string; assetTag: string; name: string }[]>([]);
  const [moveAssetQuery, setMoveAssetQuery] = useState("");
  const [assetSuggestOpen, setAssetSuggestOpen] = useState(false);
  const [assetActiveIndex, setAssetActiveIndex] = useState<number>(-1);

  const assetInputRef = React.useRef<HTMLInputElement | null>(null);
  const assetListRef = React.useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [active, setActive] = useState<"1" | "0" | "all">("1");
  const isMobile = useIsMobile();

  const filteredAssetsForMove = useMemo(() => {
    const q = moveAssetQuery.trim().toLowerCase();
    if (!q) return assetsForMove;
    return assetsForMove.filter((a) => {
      const tag = (a.assetTag || "").toLowerCase();
      const name = (a.name || "").toLowerCase();
      return tag.includes(q) || name.includes(q);
    });
  }, [assetsForMove, moveAssetQuery]);

  useEffect(() => {
    setAssetActiveIndex(filteredAssetsForMove.length ? 0 : -1);
  }, [moveAssetQuery, filteredAssetsForMove.length]);

  function scrollActiveAssetIntoView(nextIndex: number) {
    const list = assetListRef.current;
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

  const selectedMoveAsset = useMemo(() => {
    if (!moveAssetId) return null;
    return assetsForMove.find((a) => a.id === moveAssetId) || null;
  }, [assetsForMove, moveAssetId]);

  // ===== SORT (ADD) =====
  type SortDir = "asc" | "desc";
  type SortKey = "sku" | "name" | "category" | "location" | "stock" | "min" | "status";

  const [sortKey, setSortKey] = useState<SortKey>("sku");
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

    // number compare
    if (typeof a === "number" && typeof b === "number") return a - b;

    return String(a).localeCompare(String(b), "id", { sensitivity: "base" });
  }
  // ======================

  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await listInventory({ search, category, location, active });
      setItems(data);
    } catch (e: any) {
      toast.error(e?.message || "Gagal load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, location, active]);

  // Load semua data untuk autocomplete
  useEffect(() => {
    async function loadAllDataForAutocomplete() {
      try {
        // Ambil semua data inventory (termasuk disabled)
        const allInventory = await listInventory({
          active: "all",
          search: "",
          category: "",
          location: ""
        });

        // Ambil semua locations
        const locationSet = new Set<string>();
        const nameSet = new Set<string>();

        for (const item of allInventory) {
          if (item.location && item.location.trim()) {
            locationSet.add(item.location.toUpperCase());
          }
          if (item.name && item.name.trim()) {
            nameSet.add(item.name.toUpperCase());
          }
        }

        setAllLocations(Array.from(locationSet).sort((a, b) => a.localeCompare(b)));
        setAllNames(Array.from(nameSet).sort((a, b) => a.localeCompare(b)));
      } catch (e) {
        console.error("Failed to load autocomplete data:", e);
        // Fallback ke data yang sudah ada
        setAllLocations(locations);
        const nameSet = new Set<string>();
        for (const it of items) if (it.name) nameSet.add(it.name.toUpperCase());
        setAllNames(Array.from(nameSet).sort((a, b) => a.localeCompare(b)));
      }
    }

    loadAllDataForAutocomplete();
  }, [items]); // Load ulang ketika items berubah

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.location) set.add(it.location);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // ===== SORTED ITEMS (ADD) =====
  const sortedItems = useMemo(() => {
    const arr = [...items];

    arr.sort((x: any, y: any) => {
      const ax =
        sortKey === "sku" ? x.sku :
          sortKey === "name" ? x.name :
            sortKey === "category" ? x.category :
              sortKey === "location" ? (x.location || "") :
                sortKey === "stock" ? (x.stock ?? 0) :
                  sortKey === "min" ? (x.minStock ?? 0) :
                    // status: LOW/OK
                    ((x as any).isActive === 0 ? 2 : ((x.stock ?? 0) < (x.minStock ?? 0) ? 0 : 1));

      const ay =
        sortKey === "sku" ? y.sku :
          sortKey === "name" ? y.name :
            sortKey === "category" ? y.category :
              sortKey === "location" ? (y.location || "") :
                sortKey === "stock" ? (y.stock ?? 0) :
                  sortKey === "min" ? (y.minStock ?? 0) :
                    ((y as any).isActive === 0 ? 2 : ((y.stock ?? 0) < (y.minStock ?? 0) ? 0 : 1));

      const r = cmp(ax, ay);
      return sortDir === "asc" ? r : -r;
    });

    return arr;
  }, [items, sortKey, sortDir]);
  // ==============================

  // ===== PAGINATION (ADD) =====
  const filteredItems = sortedItems; // items sudah difilter dari API (search/category/location)

  useEffect(() => {
    setPage(1);
  }, [search, category, location, active, pageSize]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pagedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  // ============================

  function openAdd() {
    setForm({
      ...defaultForm,
      sku: "",
    });
    setFormOpen(true);
  }

  function openEdit(i: InventoryItem) {
    setForm({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      unit: i.unit || "PCS",
      location: i.location || "",
      capacity: (i.capacity || "").toUpperCase(),
      stock: String(i.stock ?? 0),
      minStock: String(i.minStock ?? 0),
      notes: i.notes || "",
    });
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      sku: normUpper(form.sku),
      name: normUpper(form.name),
      category: form.category,
      unit: normUpper(form.unit || "PCS"),
      location: normUpper(form.location),
      capacity: isCapacityCategory(form.category) ? normUpper(form.capacity) : "",
      stock: Number(form.stock || 0),
      minStock: Number(form.minStock || 0),
      notes: normUpper(form.notes),
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
      if (!Number.isFinite(payload.stock) || payload.stock < 0) {
        toast.error("Stock tidak valid");
        return;
      }
      if (!Number.isFinite(payload.minStock) || payload.minStock < 0) {
        toast.error("Min stock tidak valid");
        return;
      }

      if (form.id) {
        await updateInventoryItem(form.id, payload);
        toast.success("Inventory berhasil disimpan");
      } else {
        await createInventoryItem(payload);
        toast.success("Inventory berhasil ditambahkan");
      }

      setFormOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal simpan");
    }
  }

  async function onDisable(i: InventoryItem) {
    if (!canWrite) return;

    const reason = window.prompt(`Alasan nonaktifkan inventory ${i.sku} - ${i.name}?`);
    if (!reason || !reason.trim()) return;

    try {
      await disableInventoryItem(i.id, { reason: reason.trim() });
      toast.success("Inventory berhasil dinonaktifkan");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal nonaktifkan inventory");
    }
  }

  async function onRestore(i: InventoryItem) {
    if (!canWrite) return;

    const ok = window.confirm(`Restore inventory ${i.sku} - ${i.name}?`);
    if (!ok) return;

    try {
      await restoreInventoryItem(i.id);
      toast.success("Inventory berhasil diaktifkan kembali");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal restore inventory");
    }
  }

  function openMove(i: InventoryItem) {
    setMoveTarget(i);
    setMoveType("IN");
    setMoveQty("1");
    setMoveRef("");
    setMoveAssetId("");
    setAdjustMode("PLUS");
    setPurchaseDate("");
    setPurchaseLocation("");
    setDestination("");
    setMoveOpen(true);
    setMoveAssetQuery("");
    setAssetSuggestOpen(false);

    (async () => {
      try {
        // load autocomplete options from DB
        try {
          const opt = await fetchInventoryMoveOptions({ limit: 80 });
          setPurchaseLocationOptions(opt.purchaseLocations || []);
          setDestinationOptions(opt.destinations || []);
        } catch {
          // ignore
        }

        const a = await listAssets({});
        setAssetsForMove(a.map((x) => ({ id: x.id, assetTag: x.assetTag, name: x.name })));
      } catch {
        // ignore
      }
    })();
  }

  async function submitMove(e: React.FormEvent) {
    e.preventDefault();
    if (!moveTarget) return;

    const qtyAbs = Number(moveQty || 0);
    if (!Number.isFinite(qtyAbs) || qtyAbs <= 0) {
      toast.error("Qty harus > 0");
      return;
    }

    // validations
    const currentStock = Number(moveTarget.stock ?? 0);
    if (moveType === "OUT" && qtyAbs > currentStock) {
      toast.error(`Qty OUT (${qtyAbs}) melebihi stock (${currentStock})`);
      return;
    }

    if (moveType === "ADJUST" && !moveRef.trim()) {
      toast.error("Notes wajib untuk ADJUST (stok opname / koreksi)");
      return;
    }

    if (moveType === "OUT" && moveTarget.category === "OTHER") {
      if (!destination.trim()) {
        toast.error("Tujuan kirim wajib untuk kategori OTHER");
        return;
      }
    }

    try {
      const signedAdjustQty = adjustMode === "MINUS" ? -Math.abs(qtyAbs) : Math.abs(qtyAbs);
      await moveInventory(moveTarget.id, {
        type: moveType,
        qty: moveType === "ADJUST" ? signedAdjustQty : Math.abs(qtyAbs),
        ref: moveRef.trim() ? normUpper(moveRef) : undefined,
        targetAssetId: moveType === "OUT" ? (moveAssetId || undefined) : undefined,
        purchaseDate: moveType === "IN" && purchaseDate ? purchaseDate : undefined,
        purchaseLocation:
          moveType === "IN" && purchaseLocation.trim() ? normUpper(purchaseLocation) : undefined,
        destination:
          moveType === "OUT" && moveTarget.category === "OTHER" && destination.trim()
            ? normUpper(destination)
            : undefined,
      });

      toast.success("Stock berhasil diupdate");

      setMoveOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal update stock");
    }
  }

  return (
    <AppLayout>
      <div style={useThemeVars(theme)}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}>
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
              {" > Inventory"}
            </div>
            <div style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.02em"
            }}>
              Inventory
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={buttonStyle()} onClick={reload}>↻ Refresh</button>
            {canWrite ? <button style={buttonStyle("primary")} onClick={openAdd}>+ Add Item</button> : null}
          </div>
        </div>

        <Card
          title="Inventory List"
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                style={{ ...inputStyle(), width: 220 }}
                placeholder="Search SKU / Nama Item"
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
                value={category as any}
                onChange={(v) => setCategory(v as any)}
                options={[
                  { value: "" as any, label: "All Category" },
                  { value: "STORAGE" as any, label: "STORAGE" },
                  { value: "MEMORY" as any, label: "MEMORY" },
                  { value: "NETWORK" as any, label: "NETWORK" },
                  { value: "PERIPHERAL" as any, label: "PERIPHERAL" },
                  { value: "OTHER" as any, label: "OTHER" },
                ]}
                style={{ width: 170 }}
              />

              <div style={{ width: 190 }}>
                <AutocompleteTextInput
                  value={location}
                  onChange={(v) => setLocation(v)}
                  options={locations}
                  placeholder="All Location"
                  disabled={false}
                />
              </div>

              <button style={buttonStyle("primary")} onClick={reload}>Filter</button>
            </div>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    onClick={() => toggleSort("sku")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    SKU <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("sku")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("name")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Item <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("name")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("category")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Category <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("category")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("location")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Location <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("location")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("stock")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Stock <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("stock")}</span>
                  </th>

                  <th
                    onClick={() => toggleSort("min")}
                    style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none" }}
                  >
                    Min <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("min")}</span>
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
                {pagedItems.map((i) => {
                  const isLow = (i.stock ?? 0) < (i.minStock ?? 0);
                  const isDisabled = (i as any).isActive === 0;
                  return (
                    <tr style={{ transition: "background 120ms ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      key={i.id}>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-1)" }}>{i.sku}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-1)" }}>{i.name}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>{i.category}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>{i.location || "-"}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-1)" }}>{fmtInt(i.stock ?? 0)}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-2)" }}>{fmtInt(i.minStock ?? 0)}</td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        {isDisabled ? (
                          <Pill label="DISABLED" tone="gray" />
                        ) : isLow ? (
                          <Pill label="LOW" tone="red" />
                        ) : (
                          <Pill label="OK" tone="green" />
                        )}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {canWrite ? (
                            <>
                              <button style={buttonStyle()} onClick={() => openEdit(i)}>EDIT</button>
                              <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => openMove(i)}
                                style={{ ...buttonStyle("ghost"), opacity: isDisabled ? 0.5 : 1 }}
                              >
                                STOCK
                              </button>
                              <button style={buttonStyle()} onClick={() => setHistoryTarget({ id: i.id, name: i.name })}>HISTORY</button>
                            </>
                          ) : (
                            <span style={{ color: "var(--muted)", fontWeight: 800 }}>READ ONLY</span>
                          )}

                          {canWrite ? (
                            isDisabled ? (
                              <button type="button" onClick={() => onRestore(i)} style={buttonStyle("primary")}>
                                RESTORE
                              </button>
                            ) : (
                              <button type="button" onClick={() => onDisable(i)} style={buttonStyle("danger")}>
                                DISABLE
                              </button>
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
                paddingTop: 10,
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>
                {(page - 1) * pageSize + 1}–
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
                  style={{
                    ...buttonStyle("ghost"),
                    opacity: page <= 1 ? 0.45 : 1,
                    padding: "8px 12px",
                  }}
                >
                  PREV
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    ...buttonStyle("ghost"),
                    opacity: page >= totalPages ? 0.45 : 1,
                    padding: "8px 12px",
                  }}
                >
                  NEXT
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
                width: "min(720px, 100%)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 16, borderBottom: "1px solid var(--card-divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                  {form.id ? "EDIT INVENTORY" : "ADD INVENTORY"}
                </div>
                <IconCloseButton onClick={() => setFormOpen(false)} />
              </div>

              <form
                onSubmit={submitForm}
                style={{
                  padding: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div style={{ gridColumn: "span 6" }}>
                  <Label>SKU</Label>
                  <input
                    style={{
                      ...inputStyle(),
                      background: "var(--hover-1)",
                      cursor: "not-allowed",
                      color: "var(--muted)",
                      fontWeight: 900,
                    }}
                    value={form.sku}
                    readOnly
                    disabled
                    title="SKU akan digenerate otomatis"
                    placeholder="Auto Generated"
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <Label>Name</Label>
                  <input style={inputStyle()} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Category</Label>
                  <DropdownSelect
                    value={form.category as any}
                    onChange={(v) =>
                      setForm((p) => {
                        const nextCat = v as any;
                        return {
                          ...p,
                          category: nextCat,
                          capacity: isCapacityCategory(nextCat) ? p.capacity : "",
                        };
                      })
                    }
                    options={[
                      { value: "STORAGE" as any, label: "STORAGE" },
                      { value: "MEMORY" as any, label: "MEMORY" },
                      { value: "NETWORK" as any, label: "NETWORK" },
                      { value: "PERIPHERAL" as any, label: "PERIPHERAL" },
                      { value: "OTHER" as any, label: "OTHER" },
                    ]}
                  />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Unit</Label>
                  <DropdownSelect
                    value={form.unit as any}
                    onChange={(v) => setForm((p) => ({ ...p, unit: String(v) }))}
                    options={UNIT_OPTIONS as any}
                    disabled={!canWrite}
                  />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Location</Label>
                  <AutocompleteTextInput
                    value={form.location}
                    onChange={(v) => setForm((p) => ({ ...p, location: v }))}
                    options={allLocations} // Gunakan semua locations
                    placeholder="LOCATION"
                    disabled={!canWrite}
                  />
                </div>

                {isCapacityCategory(form.category) ? (
                  <div style={{ gridColumn: "span 4" }}>
                    <Label>Capacity</Label>
                    <DropdownSelect
                      value={(form.capacity || "") as any}
                      onChange={(v) => setForm((p) => ({ ...p, capacity: String(v) }))}
                      options={[
                        { value: "" as any, label: "Pilih Capacity" },
                        ...capacityOptionsByCategory(form.category).map((c) => ({ value: c as any, label: c })),
                      ]}
                      disabled={!canWrite}
                    />
                  </div>
                ) : null}

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Stock</Label>
                  <input style={inputStyle()} inputMode="numeric" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Min Stock</Label>
                  <input style={inputStyle()} inputMode="numeric" value={form.minStock} onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))} />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Notes</Label>
                  <input style={inputStyle()} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>

                <div style={{ gridColumn: "span 12", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                  <button type="button" style={buttonStyle()} onClick={() => setFormOpen(false)}>Cancel</button>
                  <button type="submit" style={buttonStyle("primary")}>Save</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Stock Move Modal */}
        {moveOpen && moveTarget ? (
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
            onMouseDown={() => setMoveOpen(false)}
          >
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: 14,
                width: "min(640px, 100%)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 16, borderBottom: "1px solid var(--card-divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>STOCK MOVEMENT</div>
                <IconCloseButton onClick={() => setMoveOpen(false)} />
              </div>

              <form onSubmit={submitMove} style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
                <div style={{ gridColumn: "span 12", color: "var(--text-1)", fontWeight: 900 }}>
                  {moveTarget.sku} — {moveTarget.name}
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <Label>Type</Label>
                  <DropdownSelect
                    value={moveType as any}
                    onChange={(t) => {
                      const v = t as any;
                      setMoveType(v);
                      if (v !== "OUT") {
                        setMoveAssetId("");
                        setMoveAssetQuery("");
                        setAssetSuggestOpen(false);
                        setAssetActiveIndex(-1);
                      }
                    }}
                    options={[
                      { value: "IN" as any, label: "IN" },
                      { value: "OUT" as any, label: "OUT" },
                      { value: "ADJUST" as any, label: "ADJUST" },
                    ]}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <Label>Qty</Label>
                  <input style={inputStyle()} inputMode="numeric" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
                </div>

                {moveType === "ADJUST" ? (
                  <div style={{ gridColumn: "span 2" }}>
                    <Label>Mode</Label>
                    <DropdownSelect
                      value={adjustMode as any}
                      onChange={(v) => setAdjustMode(v as any)}
                      options={[
                        { value: "PLUS" as any, label: "PLUS" },
                        { value: "MINUS" as any, label: "MINUS" },
                      ]}
                    />
                  </div>
                ) : null}

                <div style={{ gridColumn: "span 6" }}>
                  <Label>Ref / Notes</Label>
                  <input style={inputStyle()} value={moveRef} onChange={(e) => setMoveRef(e.target.value)} />
                </div>

                {moveType === "IN" ? (
                  <>
                    <div style={{ gridColumn: "span 4" }}>
                      <Label>Tanggal Pembelian</Label>
                      <input
                        style={inputStyle()}
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: "span 8" }}>
                      <Label>Lokasi Beli (Supplier)</Label>
                      <AutocompleteTextInput
                        value={purchaseLocation}
                        onChange={(v) => setPurchaseLocation(v)}
                        options={purchaseLocationOptions}
                        placeholder="SUPPLIER / TOKO"
                        disabled={!canWrite}
                      />
                    </div>
                  </>
                ) : null}

                {moveType === "OUT" ? (
                  <div style={{ gridColumn: "span 12" }}>
                    <Label>Ke Asset</Label>

                    <div style={{ position: "relative" }}>
                      <input
                        ref={assetInputRef}
                        style={inputStyle()}
                        placeholder="AssetTag / Nama…"
                        value={moveAssetQuery}
                        onChange={(e) => {
                          setMoveAssetQuery(e.target.value);
                          setAssetSuggestOpen(true);
                          setMoveAssetId("");
                        }}
                        onFocus={() => setAssetSuggestOpen(true)}
                        onBlur={() => setTimeout(() => setAssetSuggestOpen(false), 120)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setAssetSuggestOpen(false);
                            return;
                          }
                          if (!assetSuggestOpen) return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setAssetActiveIndex((prev) => {
                              const next = Math.min(prev + 1, filteredAssetsForMove.length - 1);
                              scrollActiveAssetIntoView(next);
                              return next;
                            });
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setAssetActiveIndex((prev) => {
                              const next = Math.max(prev - 1, 0);
                              scrollActiveAssetIntoView(next);
                              return next;
                            });
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredAssetsForMove[assetActiveIndex >= 0 ? assetActiveIndex : 0];
                            if (!picked) return;
                            setMoveAssetId(picked.id);
                            setMoveAssetQuery(`${picked.assetTag} — ${picked.name}`);
                            setAssetSuggestOpen(false);
                          }
                        }}
                      />

                      {selectedMoveAsset ? (
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <Pill label={`Selected: ${selectedMoveAsset.assetTag} — ${selectedMoveAsset.name}`} tone="gray" />
                          <button
                            type="button"
                            style={buttonStyle()}
                            onClick={() => {
                              setMoveAssetId("");
                              setMoveAssetQuery("");
                              setAssetSuggestOpen(true);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      ) : null}

                      {assetSuggestOpen && moveAssetQuery.trim() && filteredAssetsForMove.length > 0 ? (
                        <div
                          ref={assetListRef}
                          style={{
                            position: "absolute",
                            top: 48,
                            left: 0,
                            right: 0,
                            background: "var(--card-bg)",
                            border: "1px solid var(--input-border)",
                            borderRadius: 12,
                            boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                            maxHeight: 240,
                            overflow: "auto",
                            zIndex: 50,
                          }}
                        >
                          {filteredAssetsForMove.slice(0, 25).map((a, idx) => {
                            const active = idx === assetActiveIndex;
                            return (
                              <div
                                key={a.id}
                                data-idx={idx}
                                onMouseEnter={() => setAssetActiveIndex(idx)}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setMoveAssetId(a.id);
                                  setMoveAssetQuery(`${a.assetTag} — ${a.name}`);
                                  setAssetSuggestOpen(false);
                                  requestAnimationFrame(() => assetInputRef.current?.focus());
                                }}
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid var(--card-divider)",
                                  background: active ? "var(--hover-1)" : "var(--menu-bg)"
                                }}
                              >
                                <div style={{ fontWeight: 900, color: "var(--text-1)" }}>{a.assetTag}</div>
                                <div style={{ color: "var(--text-2)", fontWeight: 800, fontSize: 12 }}>{a.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 800, fontSize: 12 }}>
                      Pilih Asset jika barang keluar dipasang ke PC/Laptop/Device lainnya. Kosongkan jika tidak dipasang.
                    </div>
                  </div>
                ) : null}

                {moveType === "OUT" && moveTarget.category === "OTHER" ? (
                  <div style={{ gridColumn: "span 12" }}>
                    <Label>Tujuan Kirim</Label>
                    <AutocompleteTextInput
                      value={destination}
                      onChange={(v) => setDestination(v)}
                      options={destinationOptions}
                      placeholder="TUJUAN KIRIM"
                      disabled={!canWrite}
                    />
                  </div>
                ) : null}

                <div style={{ gridColumn: "span 12", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                  <button type="button" style={buttonStyle()} onClick={() => setMoveOpen(false)}>Cancel</button>
                  <button type="submit" style={buttonStyle("primary")}>Apply</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <div style={{ height: 8 }} />

        {historyTarget && (
          <InventoryHistoryModal
            itemId={historyTarget.id}
            itemName={historyTarget.name}
            onClose={() => setHistoryTarget(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
