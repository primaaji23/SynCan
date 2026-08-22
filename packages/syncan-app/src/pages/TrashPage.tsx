import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { isAdmin } from "../auth/auth";
import {
  listTrash,
  updateTrashEntry,
  restoreFromTrash,
  type TrashEntry,
  type DisposalStatus,
} from "../services/itService";
import { useToast } from "../components/ToastProvider";

// =====================
// Theme (sama pola dengan AssetsPage/InventoryPage)
// =====================
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

    ["--input-bg" as any]: dark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
    ["--input-border" as any]: dark ? "rgba(255,255,255,0.18)" : "#E2E8F0",

    ["--menu-bg" as any]: dark ? "#2B313D" : "#FFFFFF",
    ["--menu-border" as any]: dark ? "rgba(255,255,255,0.18)" : "#E2E8F0",
    ["--menu-shadow" as any]: dark ? "0 18px 40px rgba(0,0,0,0.55)" : "0 12px 28px rgba(0,0,0,0.12)",

    ["--table-border" as any]: dark ? "rgba(255,255,255,0.12)" : "#F1F5F9",
    ["--row-hover" as any]: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC",

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
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div style={{ position: "relative", width: (style?.width as any) ?? "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          ...inputStyle(),
          paddingRight: 42,
          textAlign: "left",
          cursor: "pointer",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          ...style,
        }}
      >
        {selected?.label ?? String(value)}
        <span style={{ position: "absolute", right: 12, top: 11, color: "var(--muted)", fontWeight: 900, pointerEvents: "none" }}>
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
                onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? "var(--hover-1)" : "var(--menu-bg)")}
              >
                <div style={{ fontWeight: 900, color: "var(--text-1)" }}>{o.label}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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

function Pill({ label, tone }: { label: string; tone: "green" | "blue" | "amber" | "gray" | "red" }) {
  const map = {
    green: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
    blue: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
    amber: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
    gray: { bg: "#F8FAFC", fg: "#475569", bd: "#E2E8F0" },
    red: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FCA5A5" },
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
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const DISPOSAL_LABEL: Record<DisposalStatus, string> = {
  IN_STORAGE: "MASIH DISIMPAN",
  DISPOSED: "SUDAH DIBUANG",
  SOLD: "SUDAH DIJUAL",
  DONATED: "SUDAH DIDONASIKAN",
};

const DISPOSAL_TONE: Record<DisposalStatus, "amber" | "gray"> = {
  IN_STORAGE: "amber",
  DISPOSED: "gray",
  SOLD: "gray",
  DONATED: "gray",
};

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

function formatAge(days: number): string {
  if (days < 30) return `${days} hari`;
  if (days < 365) return `${Math.floor(days / 30)} bulan`;
  return `${Math.floor(days / 365)} tahun`;
}

export default function TrashPage() {
  const theme = useSyncanTheme();
  const toast = useToast();
  const canWrite = isAdmin();

  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [disposalStatus, setDisposalStatus] = useState<DisposalStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editTarget, setEditTarget] = useState<TrashEntry | null>(null);
  const [editForm, setEditForm] = useState({
    physicalCondition: "",
    disposalStatus: "IN_STORAGE" as DisposalStatus,
    disposalDate: "",
    disposalNotes: "",
  });

  const [restoreTarget, setRestoreTarget] = useState<TrashEntry | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<"IN_USE" | "IN_STOCK" | "REPAIR">("IN_STOCK");

  async function reload() {
    setLoading(true);
    try {
      const rows = await listTrash({ search, disposalStatus });
      setEntries(rows);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat Trash");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, disposalStatus]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // Sorting
  type SortDir = "asc" | "desc";
  type SortKey = "assetTag" | "name" | "reason" | "physicalCondition" | "retiredAt" | "disposalStatus";

  const [sortKey, setSortKey] = useState<SortKey>("retiredAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const sortedEntries = useMemo(() => {
    const arr = [...entries];
    arr.sort((x, y) => {
      const ax = (x as any)[sortKey] || "";
      const ay = (y as any)[sortKey] || "";
      const r = cmp(ax, ay);
      return sortDir === "asc" ? r : -r;
    });
    return arr;
  }, [entries, sortKey, sortDir]);

  const total = sortedEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pagedEntries = sortedEntries.slice((page - 1) * pageSize, page * pageSize);

  function openEdit(entry: TrashEntry) {
    setEditTarget(entry);
    setEditTarget(entry);
    setEditForm({
      physicalCondition: entry.physicalCondition || "",
      disposalStatus: entry.disposalStatus,
      disposalDate: entry.disposalDate ? String(entry.disposalDate).slice(0, 10) : "",
      disposalNotes: entry.disposalNotes || "",
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;

    if (!editForm.physicalCondition.trim()) {
      toast.error("Kondisi fisik wajib diisi");
      return;
    }

    try {
      await updateTrashEntry(editTarget.retirementId, {
        physicalCondition: editForm.physicalCondition.trim().toUpperCase(),
        disposalStatus: editForm.disposalStatus,
        disposalDate: editForm.disposalStatus === "IN_STORAGE" ? "" : editForm.disposalDate,
        disposalNotes: editForm.disposalNotes.trim().toUpperCase(),
      });
      toast.success("Data Trash diperbarui");
      setEditTarget(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal memperbarui data");
    }
  }

  function openRestore(entry: TrashEntry) {
    setRestoreTarget(entry);
    setRestoreStatus("IN_STOCK");
  }

  async function submitRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreTarget) return;

    try {
      await restoreFromTrash(restoreTarget.retirementId, { status: restoreStatus });
      toast.success("Asset dikembalikan dari Trash");
      setRestoreTarget(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal restore asset");
    }
  }

  const staleCount = useMemo(
    () => entries.filter((e) => e.disposalStatus === "IN_STORAGE" && daysSince(e.retiredAt) > 180).length,
    [entries]
  );

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
            <div
              style={{
                fontSize: 13,
                color: "var(--text-3)",
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              <a
                href="/dashboard"
                style={{ color: "var(--text-3)", textDecoration: "none", transition: "color 150ms ease" }}
              >
                Home
              </a>
              {" > Trash"}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              Trash
            </div>
            {/* <div style={{ color: "var(--muted)", fontWeight: 500, fontSize: 13, marginTop: 4 }}>
              Asset yang sudah di-retire dari Assets — pantau kondisi fisik &amp; status pembuangannya di sini.
            </div> */}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={buttonStyle()} onClick={reload}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {staleCount > 0 ? (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #FDE68A",
              background: "#FFFBEB",
              color: "#B45309",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {staleCount} asset sudah &gt;6 bulan di Trash dan masih berstatus "Masih Disimpan" — pertimbangkan untuk difinalisasi (dibuang/dijual/donasi).
          </div>
        ) : null}

        <Card
          title="Daftar Asset di Trash"
          right={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                placeholder="Cari asset tag / nama / model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle(), width: 260 }}
              />
              <DropdownSelect
                value={disposalStatus as any}
                onChange={(v) => setDisposalStatus(v as any)}
                options={[
                  { value: "" as any, label: "Semua Status" },
                  { value: "IN_STORAGE" as any, label: DISPOSAL_LABEL.IN_STORAGE },
                  { value: "DISPOSED" as any, label: DISPOSAL_LABEL.DISPOSED },
                  { value: "SOLD" as any, label: DISPOSAL_LABEL.SOLD },
                  { value: "DONATED" as any, label: DISPOSAL_LABEL.DONATED },
                ]}
                style={{ width: 210 }}
              />
            </div>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {(
                    [
                      { key: "assetTag" as SortKey, label: "Asset Tag" },
                      { key: "name" as SortKey, label: "Nama" },
                      { key: "reason" as SortKey, label: "Alasan" },
                      { key: "physicalCondition" as SortKey, label: "Kondisi Fisik" },
                      { key: "retiredAt" as SortKey, label: "Di-retire" },
                      { key: "disposalStatus" as SortKey, label: "Status" },
                    ]
                  ).map((h) => (
                    <th
                      key={h.key}
                      onClick={() => toggleSort(h.key)}
                      style={{
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid var(--table-border)",
                        color: "var(--text-2)",
                        fontSize: 12,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      {h.label}{" "}
                      <span style={{ marginLeft: 4, color: "#94A3B8", fontWeight: 900 }}>{sortIcon(h.key)}</span>
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      borderBottom: "1px solid var(--table-border)",
                      color: "var(--text-2)",
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedEntries.map((e) => {
                  const age = daysSince(e.retiredAt);
                  const stale = e.disposalStatus === "IN_STORAGE" && age > 180;
                  return (
                    <tr
                      key={e.retirementId}
                      style={{ transition: "background 120ms ease" }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-1)" }}>
                        {(e.assetTag || "").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-1)" }}>
                        {(e.name || "").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)" }}>
                        {(e.reason || "-").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)" }}>
                        {(e.physicalCondition || "-").toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", color: "var(--text-2)" }}>
                        {formatAge(age)} lalu
                        {stale ? (
                          <span style={{ marginLeft: 6 }}>
                            <Pill label="LAMA" tone="red" />
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        <Pill label={DISPOSAL_LABEL[e.disposalStatus]} tone={DISPOSAL_TONE[e.disposalStatus]} />
                      </td>
                      <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                        {canWrite ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={buttonStyle()} onClick={() => openEdit(e)}>EDIT</button>
                            <button style={buttonStyle("primary")} onClick={() => openRestore(e)}>RESTORE</button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontWeight: 800 }}>READ ONLY</span>
                        )}
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
                    color: "var(--text-2)",
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

            {!loading && entries.length === 0 ? (
              <div style={{ marginTop: 10, color: "var(--muted)", fontWeight: 800 }}>Trash kosong.</div>
            ) : null}
            {loading ? (
              <div style={{ marginTop: 10, color: "var(--muted)", fontWeight: 800 }}>Memuat...</div>
            ) : null}
          </div>
        </Card>

        {/* Edit / Finalize Disposal Modal */}
        {editTarget ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 999 }}
          >
            <div style={{ background: "var(--card-bg)", borderRadius: 14, width: "min(560px, 100%)", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }} onMouseDown={(ev) => ev.stopPropagation()}>
              <div style={{ padding: 16, borderBottom: "1px solid var(--card-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                  {editTarget.assetTag} — {editTarget.name}
                </div>
                <IconCloseButton onClick={() => setEditTarget(null)} />
              </div>

              <form onSubmit={submitEdit} style={{ padding: 16, display: "grid", gap: 12 }}>
                <Field label="Kondisi Fisik">
                  <input
                    style={inputStyle()}
                    value={editForm.physicalCondition}
                    placeholder='misal: "Kardus gudang B lantai 2"'
                    onChange={(ev) => setEditForm((p) => ({ ...p, physicalCondition: ev.target.value }))}
                  />
                </Field>

                <Field label="Status Pembuangan">
                  <DropdownSelect
                    value={editForm.disposalStatus}
                    onChange={(v) => setEditForm((p) => ({ ...p, disposalStatus: v }))}
                    options={[
                      { value: "IN_STORAGE", label: DISPOSAL_LABEL.IN_STORAGE },
                      { value: "DISPOSED", label: DISPOSAL_LABEL.DISPOSED },
                      { value: "SOLD", label: DISPOSAL_LABEL.SOLD },
                      { value: "DONATED", label: DISPOSAL_LABEL.DONATED },
                    ]}
                  />
                </Field>

                {editForm.disposalStatus !== "IN_STORAGE" ? (
                  <Field label="Tanggal Pembuangan/Penjualan/Donasi">
                    <input
                      type="date"
                      style={inputStyle()}
                      value={editForm.disposalDate}
                      onChange={(ev) => setEditForm((p) => ({ ...p, disposalDate: ev.target.value }))}
                    />
                  </Field>
                ) : null}

                <Field label="Catatan (opsional)">
                  <textarea
                    style={{ ...inputStyle(), height: 80, paddingTop: 10, resize: "vertical" }}
                    value={editForm.disposalNotes}
                    onChange={(ev) => setEditForm((p) => ({ ...p, disposalNotes: ev.target.value }))}
                  />
                </Field>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" style={buttonStyle()} onClick={() => setEditTarget(null)}>BATAL</button>
                  <button type="submit" style={buttonStyle("primary")}>SIMPAN</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Restore Modal */}
        {restoreTarget ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 999 }}
          >
            <div style={{ background: "var(--card-bg)", borderRadius: 14, width: "min(460px, 100%)", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }} onMouseDown={(ev) => ev.stopPropagation()}>
              <div style={{ padding: 16, borderBottom: "1px solid var(--card-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                  Restore {restoreTarget.assetTag}
                </div>
                <IconCloseButton onClick={() => setRestoreTarget(null)} />
              </div>

              <form onSubmit={submitRestore} style={{ padding: 16, display: "grid", gap: 12 }}>
                <div style={{ color: "var(--text-2)", fontWeight: 700, fontSize: 13 }}>
                  Asset akan dikeluarkan dari Trash dan status-nya dikembalikan jadi aktif.
                </div>
                <Field label="Kembalikan ke status">
                  <DropdownSelect
                    value={restoreStatus}
                    onChange={(v) => setRestoreStatus(v)}
                    options={[
                      { value: "IN_STOCK", label: "IN_STOCK" },
                      { value: "IN_USE", label: "IN_USE" },
                      { value: "REPAIR", label: "REPAIR" },
                    ]}
                  />
                </Field>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="button" style={buttonStyle()} onClick={() => setRestoreTarget(null)}>BATAL</button>
                  <button type="submit" style={buttonStyle("primary")}>RESTORE</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
