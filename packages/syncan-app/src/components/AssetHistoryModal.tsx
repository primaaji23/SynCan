import React, { useEffect, useMemo, useState } from "react";
import { fetchAssetActivity, type ActivityLog } from "../services/itService";

type SyncanThemeName = "snowlight" | "midnight";
const SYNCAN_THEME_KEY = "syncan_theme";

function normalizeSyncanTheme(v: unknown): SyncanThemeName {
  const s = String(v ?? "").toLowerCase();
  return s === "midnight" ? "midnight" : "snowlight";
}

function useSyncanTheme(): SyncanThemeName {
  const [theme, setTheme] = useState<SyncanThemeName>(() => {
    try {
      return normalizeSyncanTheme(localStorage.getItem(SYNCAN_THEME_KEY));
    } catch {
      return "snowlight";
    }
  });

  useEffect(() => {
    const onTheme = (e: any) => setTheme(normalizeSyncanTheme(e?.detail));
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === SYNCAN_THEME_KEY) setTheme(normalizeSyncanTheme(ev.newValue));
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

function getHistoryVars(theme: SyncanThemeName) {
  if (theme === "midnight") {
    return {
      overlay: "rgba(2, 6, 23, 0.72)",
      cardBg: "linear-gradient(180deg, rgba(30,41,59,0.92) 0%, rgba(15,23,42,0.92) 100%)",
      cardBorder: "rgba(148,163,184,0.22)",
      shadow: "0 16px 40px rgba(0,0,0,0.45)",
      divider: "rgba(148,163,184,0.16)",
      text: "rgba(248,250,252,0.96)",
      subtext: "rgba(226,232,240,0.82)",
      muted: "rgba(226,232,240,0.65)",
      tableHeadBg: "rgba(2,6,23,0.28)",
      rowBorder: "rgba(148,163,184,0.12)",
      rowBg: "rgba(2,6,23,0.14)",
      rowAlt: "rgba(2,6,23,0.22)",
      rowHover: "rgba(59,130,246,0.16)",
      inputBg: "rgba(2,6,23,0.18)",
      inputBd: "rgba(148,163,184,0.22)",
      closeHoverBg: "rgba(59,130,246,0.16)",
      pillGrayBg: "rgba(148,163,184,0.16)",
      pillGrayFg: "rgba(226,232,240,0.82)",
      pillGrayBd: "rgba(148,163,184,0.24)",
      primary: "#38BDF8",
    } as const;
  }
  return {
    overlay: "rgba(15,23,42,0.45)",
    cardBg: "linear-gradient(180deg, rgba(239,246,255,0.92) 0%, rgba(248,250,252,0.92) 100%)",
    cardBorder: "rgba(37,99,235,0.14)",
    shadow: "0 12px 32px rgba(0,0,0,0.18)",
    divider: "rgba(37,99,235,0.10)",
    text: "#0F172A",
    subtext: "rgba(15,23,42,0.78)",
    muted: "rgba(15,23,42,0.58)",
    tableHeadBg: "rgba(239,246,255,0.70)",
    rowBorder: "rgba(37,99,235,0.08)",
    rowBg: "rgba(255,255,255,0.55)",
    rowAlt: "rgba(239,246,255,0.60)",
    rowHover: "rgba(59,130,246,0.10)",
    inputBg: "rgba(255,255,255,0.65)",
    inputBd: "rgba(37,99,235,0.14)",
    surface: "rgba(255,255,255,0.70)",
    btnDisabledBg: "rgba(148,163,184,0.18)",
    btnDisabledText: "rgba(15,23,42,0.35)",
    closeHoverBg: "rgba(37,99,235,0.12)",
    pillGrayBg: "rgba(148,163,184,0.18)",
    pillGrayFg: "rgba(15,23,42,0.72)",
    pillGrayBd: "rgba(148,163,184,0.26)",
    primary: "#2563EB",
  } as const;
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
        color: "var(--hm-muted)",
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
        e.currentTarget.style.background = "var(--hm-close-hover-bg)";
        e.currentTarget.style.color = "var(--hm-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--hm-muted)";
      }}
    >
      ×
    </button>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid",
        borderColor: active ? "var(--hm-primary)" : "var(--hm-card-border)",
        background: active ? "var(--hm-primary)" : "var(--hm-surface)",
        color: active ? "#fff" : "var(--hm-text)",
        padding: "8px 12px",
        borderRadius: 999,
        fontWeight: 900,
        letterSpacing: "0.02em",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
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
    gray: { bg: "var(--hm-pill-gray-bg)", fg: "var(--hm-pill-gray-fg)", bd: "var(--hm-pill-gray-bd)" },
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

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--hm-card-border)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--hm-card-bg)",
      }}
    >
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 10px",
        fontSize: 12,
        fontWeight: 900,
        color: "var(--hm-subtext)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        borderBottom: "1px solid var(--hm-divider)",
        background: "var(--hm-table-head-bg)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
  colSpan,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: "10px 10px",
        borderBottom: "1px solid var(--hm-row-border)",
        fontWeight: 800,
        color: "var(--hm-text)",
        fontSize: 13,
        verticalAlign: "top",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function tryParseMeta(value: any) {
  // meta bisa object, string JSON, atau double-stringified JSON
  let v = value;
  for (let i = 0; i < 3; i++) {
    if (typeof v !== "string") break;
    const s = v.trim();
    if (!s) break;

    try {
      v = JSON.parse(s);
      continue;
    } catch {
      // try unquote once
      if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
      ) {
        const unq = s.slice(1, -1);
        try {
          v = JSON.parse(unq);
          continue;
        } catch {
          break;
        }
      }
      break;
    }
  }
  return v;
}

function clean(v: any) {
  if (v === undefined || v === null || v === "") return "-";
  return String(v);
}

function DetailGrid({
  rows,
}: {
  rows: Array<[string, any]>;
}) {
  // Samakan seperti Inventory: "Label: value" per baris
  return (
    <>
      {rows.map(([k, v]) => (
        <div key={k}>
          <b>{k}:</b> {clean(v)}
        </div>
      ))}
    </>
  );
}


function renderDetail(log: any) {
  const action = log.action as string | undefined;
  const meta = log._meta;

  /* ===========================
   * ASSET_* (history asset)
   * ===========================
   */
  if (action?.startsWith("ASSET_")) {
    const m: any = meta && typeof meta === "object" ? meta : {};

    if (action === "ASSET_CREATE") {
      const rows: Array<[string, any]> = [
        ["Asset Tag", m.assetTag || "-"],
        ["Name", m.name || "-"],
        ["Type", m.type || "-"],
        ["Status", m.status || "-"],
        ["Brand", m.brand || "-"],
        ["Model", m.model || "-"],
        ["Serial", m.serialNumber || "-"],
        ["Location", m.location || "-"],
        ["Owner", m.assignedTo || m.owner || "-"],
      ];

      // Filter out rows dengan value "-" atau kosong
      const filteredRows = rows.filter(([_, value]) =>
        value && value !== "-" && value !== ""
      );

      if (filteredRows.length > 0) {
        return <DetailGrid rows={filteredRows} />;
      } else {
        // Fallback jika meta tidak ada
        return <DetailGrid rows={[["Action", "Asset created"]]} />;
      }
    }
    // 1) ASSET_DELETE → soft delete / disable
    if (action === "ASSET_DELETE" && (m.soft !== undefined || m.reason)) {
      const rows: Array<[string, any]> = [
        ["Soft delete", m.soft ? "YES" : "NO"],
      ];
      if (m.reason) rows.push(["Reason", String(m.reason)]);
      return <DetailGrid rows={rows} />;
    }

    // 2) AS _UPDATE khusus restore (meta: { restored: true })
    const restoredFlag =
      m.restored === true ||
      m.restored === "true" ||
      (m.after &&
        (m.after.restored === true || m.after.restored === "true"));

    if (action === "ASSET_UPDATE" && restoredFlag) {
      return (
        <DetailGrid rows={[["Action", "RESTORE (aktifkan kembali asset)"]]} />
      );
    }

    // 3) ASSET_UPDATE biasa → tampilkan hanya field yang berubah
    if (action === "ASSET_UPDATE") {
      const hasBefore =
        m &&
        typeof m === "object" &&
        m.before &&
        m.after &&
        typeof m.before === "object" &&
        typeof m.after === "object";

      const before: any = hasBefore ? (m.before as any) : null;
      const after: any = hasBefore ? (m.after as any) : m;

      const rows: Array<[string, any]> = [];

      const addField = (
        key: string,
        label: string,
        opts?: { checklist?: boolean; dateOnly?: boolean }
      ) => {
        const oldVal = before ? before[key] : undefined;
        const newVal = after ? after[key] : undefined;

        const norm = (v: any) => {
          if (opts?.checklist) return v ? "ON" : "OFF";
          if (opts?.dateOnly) return toYMDLocal(v);
          if (v === undefined || v === null) return "";
          const s = String(v).trim();
          return s;
        };

        const oldStr = norm(oldVal);
        const newStr = norm(newVal);

        if (before) {
          // mode diff: skip kalau tidak berubah
          if (oldStr === newStr) return;
        } else {
          // fallback log lama: skip kalau kosong
          if (!newStr) return;
        }

        const val = before
          ? oldStr
            ? `${oldStr} → ${newStr || "-"}`
            : newStr || "-"
          : newStr || "-";

        rows.push([label, val]);
      };

      // field utama asset
      addField("assetTag", "Asset Tag");
      addField("name", "Name");
      addField("type", "Type");
      addField("status", "Status");
      addField("brand", "Brand");
      addField("model", "Model");
      addField("serialNumber", "Serial");
      addField("assignedTo", "Owner");
      addField("location", "Location");
      addField("purchaseDate", "Purchase Date", { dateOnly: true });
      addField("warrantyEnd", "Warranty End", { dateOnly: true });
      addField("notes", "Notes");

      // spesifikasi & checklist (kalau ada di payload)
      addField("cpuSpec", "CPU");
      addField("ramSpec", "RAM");
      addField("hddSpec", "HDD / Storage");
      addField("vgaCard", "VGA Card");

      addField("ckUsbLan", "USB LAN", { checklist: true });
      addField("ckMouse", "Mouse", { checklist: true });
      addField("ckTas", "Tas", { checklist: true });
      addField("ckKeyboard", "Keyboard", { checklist: true });
      addField("ckUsbHub", "USB Hub", { checklist: true });

      if (!rows.length) {
        return (
          <span style={{ color: "var(--hm-muted)", fontWeight: 800 }}>
            -
          </span>
        );
      }

      return <DetailGrid rows={rows} />;
    }

    // 4) fallback untuk ASSET_* lain / log lama (tanpa before/after)
    const base: any = (m && (m.after ?? m)) || {};
    const rowsFallback: Array<[string, any]> = [];

    const pushIfPresent = (label: string, value: any) => {
      if (value === undefined || value === null) return;
      const s = String(value).trim();
      if (!s) return;
      rowsFallback.push([label, s]);
    };

    pushIfPresent("Status", base.status ?? m?.status);
    pushIfPresent(
      "Owner",
      base.assignedTo ?? m?.assignedTo ?? base.owner ?? m?.owner
    );
    pushIfPresent("Location", base.location ?? m?.location);
    pushIfPresent("Serial", base.serialNumber ?? m?.serialNumber);
    pushIfPresent("Notes", base.notes ?? m?.notes);

    if (!rowsFallback.length) {
      return (
        <span style={{ color: "var(--hm-muted)", fontWeight: 800 }}>
          -
        </span>
      );
    }

    return <DetailGrid rows={rowsFallback} />;
  }

  /* ===========================
   * INV_* / INV_MOVE (link ke inventory)
   * ===========================
   */
  if (log.action === "INV_MOVE" || log.action?.startsWith("INV_")) {
    return (
      <DetailGrid rows={[["Type", meta?.type], ["Qty", meta?.qty], ["Ref", meta?.ref], ["Purchase Date", meta?.purchaseDate], ["Purchase Location", meta?.purchaseLocation], ["Destination", meta?.destination], ["Inventory ID", meta?.inventoryId ?? meta?.itemId], ["SKU", meta?.sku], ["Item", meta?.name], ["Asset", meta?.assetTag ?? meta?.targetAssetTag ?? meta?.assetId ?? meta?.targetAssetId,],]} />
    );
  }

  // fallback generic
  if (meta && typeof meta === "object") {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          color: "var(--hm-text)",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {JSON.stringify(meta, null, 2)}
      </pre>
    );
  }

  return <span style={{ color: "var(--hm-muted)", fontWeight: 800 }}>-</span>;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Convert ISO datetime (or Date) to YYYY-MM-DD using LOCAL timezone.
 * This prevents date-shift issues like 2026-01-20T17:00:00.000Z (UTC) showing as 2026-01-20,
 * while the intended local date is 2026-01-21.
 */
function toYMDLocal(v: any): string {
  if (v === undefined || v === null) return "";
  // already YYYY-MM-DD
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();

  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v).trim();

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}


function Pager({
  page,
  total,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingTop: 12,
      }}
    >
      <div style={{ color: "var(--hm-muted)", fontWeight: 900, fontSize: 12 }}>
        {total === 0
          ? "Showing 0 of 0"
          : `Showing ${start}–${end} of ${total}`}
        <span style={{ marginLeft: 8 }}>
          (Page {safePage}/{totalPages})
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={safePage <= 1}
          style={{
            border: "1px solid var(--hm-card-border)",
            background: "var(--hm-surface)",
            color: safePage <= 1 ? "var(--hm-btn-disabled-text)" : "var(--hm-text)",
            padding: "8px 12px",
            borderRadius: 10,
            fontWeight: 900,
            cursor: safePage <= 1 ? "not-allowed" : "pointer",
          }}
        >
          PREV
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={safePage >= totalPages}
          style={{
            border: "1px solid var(--hm-card-border)",
            background: "var(--hm-surface)",
            color: safePage >= totalPages ? "var(--hm-btn-disabled-text)" : "var(--hm-text)",
            padding: "8px 12px",
            borderRadius: 10,
            fontWeight: 900,
            cursor: safePage >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          NEXT
        </button>
      </div>
    </div>
  );
}

type TabKey = "movements" | "activity";

export default function AssetHistoryModal({
  assetId,
  assetName,
  onClose,
}: {
  assetId: string;
  assetName: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("activity");
  const [activityPage, setActivityPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);

  const pageSize = 10;

  const theme = useSyncanTheme();
  const vars = useMemo(() => getHistoryVars(theme), [theme]);

  const cssVars = useMemo(
    () => ({
      ["--hm-overlay" as any]: vars.overlay,
      ["--hm-card-bg" as any]: vars.cardBg,
      ["--hm-card-border" as any]: vars.cardBorder,
      ["--hm-shadow" as any]: vars.shadow,
      ["--hm-divider" as any]: vars.divider,
      ["--hm-surface" as any]: vars.surface,
      ["--hm-btn-disabled-bg" as any]: vars.btnDisabledBg,
      ["--hm-btn-disabled-text" as any]: vars.btnDisabledText,
      ["--hm-text" as any]: vars.text,
      ["--hm-subtext" as any]: vars.subtext,
      ["--hm-muted" as any]: vars.muted,
      ["--hm-table-head-bg" as any]: vars.tableHeadBg,
      ["--hm-row-border" as any]: vars.rowBorder,
      ["--hm-row-bg" as any]: vars.rowBg,
      ["--hm-row-alt" as any]: vars.rowAlt,
      ["--hm-row-hover" as any]: vars.rowHover,
      ["--hm-input-bg" as any]: vars.inputBg,
      ["--hm-input-bd" as any]: vars.inputBd,
      ["--hm-close-hover-bg" as any]: vars.closeHoverBg,
      ["--hm-pill-gray-bg" as any]: vars.pillGrayBg,
      ["--hm-pill-gray-fg" as any]: vars.pillGrayFg,
      ["--hm-pill-gray-bd" as any]: vars.pillGrayBd,
      ["--hm-primary" as any]: vars.primary,
    }),
    [vars]
  );


  useEffect(() => {
    let alive = true;
    setLoading(true);
    setActivityPage(1);
    setMovementPage(1);

    (async () => {
      try {
        const res = await fetchAssetActivity(assetId);
        if (!alive) return;
        setLogs(res.logs || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [assetId]);

  const normalized = useMemo(() => {
    return (logs || []).map((l: any) => ({ ...l, _meta: tryParseMeta(l.meta) }));
  }, [logs]);

  const movementLogs = useMemo(() => {
    const onlyMoves = normalized.filter((l: any) => l.action === "INV_MOVE");
    onlyMoves.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return onlyMoves;
  }, [normalized]);

  const activityLogs = useMemo(() => {
    const others = normalized.filter((l: any) => l.action !== "INV_MOVE");
    others.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return others;
  }, [normalized]);

  const movementSlice = useMemo(() => {
    const start = (movementPage - 1) * pageSize;
    return movementLogs.slice(start, start + pageSize);
  }, [movementLogs, movementPage]);

  const activitySlice = useMemo(() => {
    const start = (activityPage - 1) * pageSize;
    return activityLogs.slice(start, start + pageSize);
  }, [activityLogs, activityPage]);

  const safeAssetName = assetName?.trim() ? assetName.trim() : "(Unknown)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        ...cssVars,
        position: "fixed",
        inset: 0,
        background: "var(--hm-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 999,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: "var(--hm-card-bg)",
          borderRadius: 14,
          width: "min(980px, 100%)",
          maxHeight: "82vh",
          overflow: "hidden",
          boxShadow: "var(--hm-shadow)",
          border: "1px solid var(--hm-card-border)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid var(--hm-row-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 950, color: "var(--hm-text)" }}>
              HISTORY — {safeAssetName}
            </div>
            <div
              style={{
                marginTop: 4,
                color: "var(--hm-muted)",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Movements = INV_MOVE untuk asset ini. Activity = event asset lainnya.
            </div>
          </div>

          <IconCloseButton onClick={onClose} />
        </div>

        {/* ===== TABS ===== */}
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--hm-row-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            background: "transparent",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <TabButton
              active={tab === "movements"}
              onClick={() => setTab("movements")}
              label={`📦 Movements (${movementLogs.length})`}
            />
            <TabButton
              active={tab === "activity"}
              onClick={() => setTab("activity")}
              label={`📝 Activity (${activityLogs.length})`}
            />
          </div>

          <div style={{ color: "var(--hm-muted)", fontWeight: 900, fontSize: 12 }}>
            {loading
              ? "Loading..."
              : tab === "movements"
                ? "Inventory Movements"
                : "Asset Activity"}
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div style={{ padding: 14, maxHeight: "62vh", overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: 6, color: "var(--hm-muted)", fontWeight: 900 }}>
              Loading…
            </div>
          ) : tab === "movements" ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 950, color: "var(--hm-text)" }}>
                  Movements
                </div>
                <div style={{ color: "var(--hm-muted)", fontWeight: 800, fontSize: 12 }}>
                  Total data: {movementLogs.length}
                </div>
              </div>

              <TableShell>
                <table
                  width="100%"
                  style={{ borderCollapse: "collapse", minWidth: 860 }}
                >
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Qty</Th>
                      <Th>Ref</Th>
                      <Th>Purchase</Th>
                      <Th>Destination</Th>
                      <Th>Inventory</Th>
                      <Th>User</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementSlice.map((l: any, idx: number) => {
                      const m = l._meta || {};
                      const tone =
                        m.type === "IN"
                          ? "green"
                          : m.type === "OUT"
                            ? "blue"
                            : "amber";
                      const invLabel =
                        m.sku || m.name
                          ? `${clean(m.sku)} — ${clean(m.name)}`
                          : clean(m.inventoryId ?? m.itemId);
                      const purchase = m.purchaseDate
                        ? `${clean(m.purchaseDate)}${m.purchaseLocation ? ` — ${clean(m.purchaseLocation)}` : ""
                        }`
                        : "-";
                      return (
                        <tr
                          key={l.id}
                          style={{ background: idx % 2 === 0 ? "var(--hm-row-bg)" : "var(--hm-row-alt)" }}
                        >
                          <Td style={{ whiteSpace: "nowrap", color: "var(--hm-subtext)" }}>
                            {fmtDate(l.createdAt)}
                          </Td>
                          <Td>
                            <Pill label={clean(m.type)} tone={tone} />
                          </Td>
                          <Td>{clean(m.qty)}</Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>{clean(m.ref)}</Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>{purchase}</Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>
                            {m.type === "OUT" ? clean(m.destination) : "-"}
                          </Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>{invLabel}</Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>{clean(l.actorUsername)}</Td>
                        </tr>
                      );
                    })}
                    {movementSlice.length === 0 && (
                      <tr>
                        <Td colSpan={8} style={{ color: "var(--hm-muted)" }}>
                          Tidak ada movements.
                        </Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>

              <Pager
                page={movementPage}
                total={movementLogs.length}
                pageSize={pageSize}
                onPrev={() => setMovementPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setMovementPage((p) =>
                    Math.min(Math.ceil(movementLogs.length / pageSize) || 1, p + 1)
                  )
                }
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 950, color: "var(--hm-text)" }}>
                  Activity Log
                </div>
                <div style={{ color: "var(--hm-muted)", fontWeight: 800, fontSize: 12 }}>
                  Total data: {activityLogs.length}
                </div>
              </div>

              <TableShell>
                <table
                  width="100%"
                  style={{ borderCollapse: "collapse", minWidth: 860 }}
                >
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Action</Th>
                      <Th>User</Th>
                      <Th style={{ width: "46%" }}>Detail</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitySlice.map((l: any, idx: number) => (
                      <tr
                        key={l.id}
                        style={{ background: idx % 2 === 0 ? "var(--hm-row-bg)" : "var(--hm-row-alt)" }}
                      >
                        <Td style={{ whiteSpace: "nowrap", color: "var(--hm-subtext)" }}>
                          {fmtDate(l.createdAt)}
                        </Td>
                        <Td>
                          <Pill label={clean(l.action)} tone="gray" />
                        </Td>
                        <Td style={{ color: "var(--hm-subtext)" }}>{clean(l.actorUsername)}</Td>
                        <Td
                          style={{
                            width: "46%",
                            color: "var(--hm-subtext)",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {renderDetail(l)}
                        </Td>
                      </tr>
                    ))}
                    {activitySlice.length === 0 && (
                      <tr>
                        <Td colSpan={4} style={{ color: "var(--hm-muted)" }}>
                          Tidak ada activity.
                        </Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>

              <Pager
                page={activityPage}
                total={activityLogs.length}
                pageSize={pageSize}
                onPrev={() => setActivityPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setActivityPage((p) =>
                    Math.min(Math.ceil(activityLogs.length / pageSize) || 1, p + 1)
                  )
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
