import React, { useEffect, useMemo, useState } from "react";
import {
  fetchInventoryMovements,
  fetchInventoryActivity,
  InventoryMovement,
  ActivityLog,
} from "../services/itService";

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

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid var(--hm-card-border)",
        background: disabled ? "var(--hm-btn-disabled-bg)" : "var(--hm-surface)",
        color: disabled ? "var(--hm-btn-disabled-text)" : "var(--hm-text)",
        padding: "8px 12px",
        borderRadius: 10,
        fontWeight: 900,
        letterSpacing: "0.02em",
        cursor: disabled ? "not-allowed" : "pointer",
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

/* ===== helper render activity meta ===== */
function renderActivityDetail(action: string, meta: any) {
  if (!meta) return "-";

  // meta kadang string JSON dari backend
  let m: any = meta;
  if (typeof meta === "string") {
    try {
      m = JSON.parse(meta);
    } catch {
      return <span>{meta}</span>;
    }
  }

  // Helper untuk normalize value
  const cleanValue = (v: any) => {
    if (v === undefined || v === null || v === "") return "-";
    return String(v);
  };

  if (action === "INV_CREATE") {
    // Cek format meta dari backend
    // Bisa berupa: { sku, name } atau { before: {}, after: {} }
    let sku = m.sku;
    let name = m.name;

    // Jika format baru (before/after)
    if (m.after && typeof m.after === "object") {
      sku = m.after.sku || sku;
      name = m.after.name || name;
    }

    return (
      <>
        <div>
          <b>SKU:</b> {cleanValue(sku)}
        </div>
        <div>
          <b>Name:</b> {cleanValue(name)}
        </div>
        <div>
          <b>Category:</b> {cleanValue(m.category || m.after?.category)}
        </div>
        <div>
          <b>Stock:</b> {cleanValue(m.stock || m.after?.stock)}
        </div>
        <div>
          <b>Location:</b> {cleanValue(m.location || m.after?.location)}
        </div>
        <div>
          <b>Capacity:</b> {cleanValue(m.capacity || m.after?.capacity)}
        </div>
      </>
    );
  }

  if (action === "INV_UPDATE") {
    // restore (backend logs: { restored: true })
    const restoredFlag =
      m?.restored === true ||
      m?.restored === "true" ||
      (m?.after && (m.after.restored === true || m.after.restored === "true"));
    if (restoredFlag) {
      return (
        <div>
          <b>Action:</b> RESTORE (aktifkan kembali inventory)
        </div>
      );
    }

    // meta baru: { before: {...}, after: {...} }
    const hasBefore =
      m && typeof m === "object" && m.before && m.after;

    const before = hasBefore ? (m.before as any) : null;
    const after = hasBefore ? (m.after as any) : m; // fallback: log lama

    type Row = { label: string; oldVal?: string; newVal: string };

    const fields: { key: string; label: string }[] = [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "location", label: "Location" },
      { key: "capacity", label: "Capacity" },
      { key: "stock", label: "Stock" },
      { key: "minStock", label: "Min Stock" },
      { key: "notes", label: "Notes" },
    ];

    const rows: Row[] = [];

    for (const f of fields) {
      const rawOld = before ? before[f.key] : undefined;
      const rawNew = after ? after[f.key] : undefined;

      const oldStr =
        rawOld === undefined || rawOld === null
          ? ""
          : String(rawOld).trim();
      const newStr =
        rawNew === undefined || rawNew === null
          ? ""
          : String(rawNew).trim();

      if (hasBefore) {
        // hanya tampil kalau BENAR-BENAR BERUBAH
        if (oldStr === newStr) continue;
      } else {
        // log lama (tanpa before): tampilkan yang ada nilainya saja
        if (!newStr) continue;
      }

      rows.push({
        label: f.label,
        oldVal: oldStr,
        newVal: newStr,
      });
    }

    if (!rows.length) return <span>-</span>;

    if (m && (m.restored === true || m.restored === "true")) {
      return (
        <>
          <div>
            <b>Restored:</b> YES
          </div>
        </>
      );
    }

    return (
      <>
        {rows.map((r) => (
          <div key={r.label}>
            <b>{r.label}:</b>{" "}
            {hasBefore ? (
              <>
                {r.oldVal || "-"} {" \u2192 "} {r.newVal || "-"}
              </>
            ) : (
              r.newVal || "-"
            )}
          </div>
        ))}
      </>
    );
  }

  if (action === "INV_MOVE") {
    return (
      <>
        <div>
          <b>Type:</b> {m.type ?? "-"}
        </div>
        <div>
          <b>Qty:</b> {m.qty ?? "-"}
        </div>
        <div>
          <b>Ref:</b> {m.ref && String(m.ref).trim() ? m.ref : "-"}
        </div>
        {(m.targetAssetId ?? null) !== null && (
          <div>
            <b>Target Asset ID:</b> {m.targetAssetId}
          </div>
        )}

        {/* extra fields */}
        {m.type === "IN" ? (
          <>
            <div>
              <b>Purchase Date:</b> {m.purchaseDate || "-"}
            </div>
            <div>
              <b>Purchase Location:</b> {m.purchaseLocation || "-"}
            </div>
          </>
        ) : null}

        {m.type === "OUT" ? (
          <div>
            <b>Destination:</b> {m.destination || "-"}
          </div>
        ) : null}
      </>
    );
  }

  if (action === "INV_DELETE") {
    const soft = m.soft === true;
    const reason = m.reason;

    return (
      <>
        <div>
          <b>Soft delete:</b> {soft ? "YES" : "NO"}
        </div>
        {reason ? (
          <div>
            <b>Reason: {reason}</b>
          </div >
        ) : null
        }
      </>
    );
  }

  return (
    <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
      {JSON.stringify(m, null, 2)}
    </pre>
  );
}

function fmtDateOnly(d?: string | null) {
  if (!d) return "-";
  // ambil YYYY-MM-DD saja, aman untuk ISO / DATE
  return String(d).slice(0, 10);
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

type TabKey = "movements" | "activity";

function PaginationBar({
  page,
  pageSize,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div
      style={{
        marginTop: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ color: "var(--hm-muted)", fontWeight: 900, fontSize: 12 }}>
        {total === 0
          ? "No data"
          : `Showing ${start}-${end} of ${total} (Page ${safePage}/${totalPages})`}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <ActionButton
          label="PREV"
          disabled={safePage <= 1 || total === 0}
          onClick={onPrev}
        />
        <ActionButton
          label="NEXT"
          disabled={safePage >= totalPages || total === 0}
          onClick={onNext}
        />
      </div>
    </div>
  );
}

export default function InventoryHistoryModal({
  itemId,
  itemName,
  onClose,
}: {
  itemId: string;
  itemName: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("movements");

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

  const [movementPage, setMovementPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMovementPage(1);
    setActivityPage(1);

    (async () => {
      try {
        const [m, a] = await Promise.all([
          fetchInventoryMovements(itemId),
          fetchInventoryActivity(itemId),
        ]);
        if (!alive) return;
        setMovements(m.movements || []);
        setLogs(a.logs || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [itemId]);

  const movementsSorted = useMemo(() => {
    return [...movements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [movements]);

  const logsSorted = useMemo(() => {
    return [...logs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [logs]);

  const movementTotalPages = useMemo(
    () => Math.max(1, Math.ceil(movementsSorted.length / pageSize)),
    [movementsSorted.length]
  );

  const activityTotalPages = useMemo(
    () => Math.max(1, Math.ceil(logsSorted.length / pageSize)),
    [logsSorted.length]
  );

  const movementPageSafe = Math.min(
    Math.max(1, movementPage),
    movementTotalPages
  );
  const activityPageSafe = Math.min(
    Math.max(1, activityPage),
    activityTotalPages
  );

  const movementRows = useMemo(() => {
    const start = (movementPageSafe - 1) * pageSize;
    return movementsSorted.slice(start, start + pageSize);
  }, [movementsSorted, movementPageSafe]);

  const activityRows = useMemo(() => {
    const start = (activityPageSafe - 1) * pageSize;
    return logsSorted.slice(start, start + pageSize);
  }, [logsSorted, activityPageSafe]);

  // kalau data berubah, pastiin page tidak out-of-range
  useEffect(() => {
    if (movementPage > movementTotalPages) setMovementPage(movementTotalPages);
  }, [movementTotalPages]);

  useEffect(() => {
    if (activityPage > activityTotalPages) setActivityPage(activityTotalPages);
  }, [activityTotalPages]);

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
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 900, color: "var(--hm-text)" }}>
              HISTORY — {itemName}
            </div>
            <div
              style={{
                marginTop: 4,
                color: "var(--hm-muted)",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Pagination: <b>10</b> rows per page.
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
              label={`📦 Movements (${movements.length})`}
            />
            <TabButton
              active={tab === "activity"}
              onClick={() => setTab("activity")}
              label={`📝 Activity (${logs.length})`}
            />
          </div>

          <div style={{ color: "var(--hm-muted)", fontWeight: 900, fontSize: 12 }}>
            {loading
              ? "Loading..."
              : tab === "movements"
                ? `Stock Movements • Page ${movementPageSafe}/${movementTotalPages}`
                : `Activity Log • Page ${activityPageSafe}/${activityTotalPages}`}
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div style={{ padding: 14, maxHeight: "62vh", overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: 10, color: "var(--hm-muted)", fontWeight: 800 }}>
              Loading...
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
                <div style={{ fontWeight: 900, color: "var(--hm-text)" }}>
                  Stock Movements
                </div>
                <div style={{ color: "var(--hm-muted)", fontWeight: 800, fontSize: 12 }}>
                  Total data: {movements.length}
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
                      <Th>User</Th>
                      <Th>Asset</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementRows.map((m, idx) => {
                      const tone =
                        m.type === "IN"
                          ? "green"
                          : m.type === "OUT"
                            ? "blue"
                            : "amber";
                      return (
                        <tr
                          key={m.id}
                          style={{
                            background: idx % 2 === 0 ? "var(--hm-row-bg)" : "var(--hm-row-alt)",
                          }}
                        >
                          <Td style={{ whiteSpace: "nowrap", color: "var(--hm-subtext)" }}>
                            {new Date(m.createdAt).toLocaleString()}
                          </Td>
                          <Td>
                            <Pill label={m.type} tone={tone} />
                          </Td>
                          <Td>{m.qty}</Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>
                            {m.ref && String(m.ref).trim() ? m.ref : "-"}
                          </Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>
                            {m.purchaseDate ? (
                              <>
                                {fmtDateOnly(m.purchaseDate)}
                                {m.purchaseLocation
                                  ? ` — ${m.purchaseLocation}`
                                  : ""}
                              </>
                            ) : (
                              "-"
                            )}
                          </Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>
                            {m.type === "OUT" ? m.destination || "-" : "-"}
                          </Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>
                            {m.createdBy || "-"}
                          </Td>
                          <Td style={{ color: "var(--hm-subtext)" }}>
                            {m.targetAssetTag
                              ? `${m.targetAssetTag} – ${m.targetAssetName || ""}`
                              : m.targetAssetId || "-"}
                          </Td>
                        </tr>
                      );
                    })}
                    {movementRows.length === 0 && (
                      <tr>
                        <Td colSpan={8} style={{ color: "var(--hm-muted)" }}>
                          No movements
                        </Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>

              <PaginationBar
                page={movementPageSafe}
                pageSize={pageSize}
                total={movementsSorted.length}
                onPrev={() => setMovementPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setMovementPage((p) => Math.min(movementTotalPages, p + 1))
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
                <div style={{ fontWeight: 900, color: "var(--hm-text)" }}>
                  Activity Log
                </div>
                <div style={{ color: "var(--hm-muted)", fontWeight: 800, fontSize: 12 }}>
                  Total data: {logs.length}
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
                    {activityRows.map((l, idx) => (
                      <tr
                        key={l.id}
                        style={{
                          background: idx % 2 === 0 ? "var(--hm-row-bg)" : "var(--hm-row-alt)",
                        }}
                      >
                        <Td style={{ whiteSpace: "nowrap", color: "var(--hm-subtext)" }}>
                          {new Date(l.createdAt).toLocaleString()}
                        </Td>
                        <Td>
                          <Pill label={l.action} tone="gray" />
                        </Td>
                        <Td style={{ color: "var(--hm-subtext)" }}>
                          {l.actorUsername || "-"}
                        </Td>
                        <Td
                          style={{
                            width: "46%",
                            color: "var(--hm-subtext)",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {renderActivityDetail(l.action, l.meta)}
                        </Td>
                      </tr>
                    ))}
                    {activityRows.length === 0 && (
                      <tr>
                        <Td colSpan={4} style={{ color: "var(--hm-muted)" }}>
                          No logs
                        </Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>

              <PaginationBar
                page={activityPageSafe}
                pageSize={pageSize}
                total={logsSorted.length}
                onPrev={() => setActivityPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setActivityPage((p) => Math.min(activityTotalPages, p + 1))
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
