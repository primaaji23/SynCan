import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { isAdmin } from "../auth/auth";
import {
    createToner,
    listToner,
    updateToner,
    moveToner,
    disableToner,
    restoreToner,
    getNextTonerSerial,
    type Toner,
    type TonerStatus,
    type TonerMoveRequest,
} from "../services/itService";
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
        if (!q) return options.slice(0, 30);
        return options
            .filter((o) => o.toLowerCase().includes(q))
            .slice(0, 30);
    }, [options, value]);

    React.useEffect(() => {
        setActiveIndex(filtered.length ? 0 : -1);
    }, [value, filtered.length]);

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
    variant: "primary" | "ghost" | "danger" = "ghost"
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
    tone: "blue" | "amber" | "green" | "gray";
}) {
    const map = {
        blue: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
        amber: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
        green: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
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
    tonerSerial: string;
    name: string;
    model: string;
    vendor: string;
    origin: string;
    location: string;
    status: TonerStatus;
    notes: string;
};

const defaultForm: FormState = {
    id: undefined,
    tonerSerial: "",
    name: "",
    model: "",
    vendor: "",
    origin: "",
    location: "",
    status: "PENDING",
    notes: "",
};

type MoveFormState = {
    status: TonerStatus;
    location: string;
    notes: string;
};

const defaultMoveForm: MoveFormState = {
    status: "PENDING",
    location: "",
    notes: "",
};

function NotesTooltip({ content, children }: { content: string; children: React.ReactNode }) {
    const [show, setShow] = useState(false);

    if (!content || content.trim() === "") {
        return <>{children}</>;
    }

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
            </div>

            {show && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "var(--text-1)",
                        width: "max-content",
                        maxWidth: "300px",
                        boxShadow: "var(--menu-shadow)",
                        zIndex: 100,
                        marginBottom: "8px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                >
                    {content}
                </div>
            )}
        </div>
    );
}

export default function TonerPage() {
    const theme = useSyncanTheme();

    const canWrite = isAdmin();
    const toast = useToast();

    const [items, setItems] = useState<Toner[]>([]);
    const [loading, setLoading] = useState(true);

    const [allTonerData, setAllTonerData] = useState<Toner[]>([]);
    const [loadingAll, setLoadingAll] = useState(false);

    const [search, setSearch] = useState("");

    type StatusFilterOption = TonerStatus | "ALL" | "NOT_FINISH";
    const [status, setStatus] = useState<TonerStatus | "">("");
    const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("NOT_FINISH");

    const [origin, setOrigin] = useState("");
    const [location, setLocation] = useState("");
    const [createdAt, setCreatedAt] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<FormState>(defaultForm);

    const [moveOpen, setMoveOpen] = useState(false);
    const [moveTarget, setMoveTarget] = useState<Toner | null>(null);
    const [moveForm, setMoveForm] = useState<MoveFormState>(defaultMoveForm);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [active, setActive] = useState<"1" | "0" | "all">("1");

    // Data untuk autocomplete
    const names = useMemo(() => {
        const set = new Set<string>();
        for (const it of allTonerData) if (it.name) set.add(it.name.toUpperCase());
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allTonerData]);

    const models = useMemo(() => {
        const set = new Set<string>();
        for (const it of allTonerData) if (it.model) set.add(it.model.toUpperCase());
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allTonerData]);

    const vendors = useMemo(() => {
        const set = new Set<string>();
        for (const it of allTonerData) if (it.vendor) set.add(it.vendor.toUpperCase());
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allTonerData]);

    const origins = useMemo(() => {
        const set = new Set<string>();
        for (const it of allTonerData) if (it.origin) set.add(it.origin.toUpperCase());
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allTonerData]);

    const locationsOptions = useMemo(() => {
        const set = new Set<string>();
        for (const it of allTonerData) if (it.location) set.add(it.location.toUpperCase());
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allTonerData]);

    const infoBoxStyle = (type: "warning" | "success") => ({
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: 900,
        marginTop: "4px",
        background: type === "warning" ? "#FFFBEB" : "#ECFDF5",
        border: `1px solid ${type === "warning" ? "#FDE68A" : "#A7F3D0"}`,
        color: type === "warning" ? "#B45309" : "#047857",
    });

    async function loadAllTonerData() {
        if (loadingAll) return;

        setLoadingAll(true);
        try {
            // Ambil SEMUA data toner (active: "all" untuk ambil semua termasuk disabled)
            const allData = await listToner({
                active: "all",
                search: "",
                status: "",
                origin: "",
                location: ""
            });
            setAllTonerData(allData);
        } catch (e: any) {
            console.error("Gagal load semua data toner untuk autocomplete:", e);
            // Fallback ke data yang sudah ada
            setAllTonerData(items);
        } finally {
            setLoadingAll(false);
        }
    }

    async function reload() {
        setLoading(true);
        try {
            const params: any = {
                search,
                origin,
                location,
                active
            };

            if (statusFilter !== "ALL" && statusFilter !== "NOT_FINISH") {
                params.status = statusFilter;
            }

            const data = await listToner(params);

            // Filter khusus untuk NOT_FINISH
            let filteredData = data;
            if (statusFilter === "NOT_FINISH") {
                filteredData = data.filter(item =>
                    item.status === "PENDING" || item.status === "ON_PROGRESS"
                );
            }

            setItems(filteredData);
        } catch (e: any) {
            toast.error(e?.message || "Gagal load toner");
        } finally {
            setLoading(false);
        }
    }

    // Sorting
    type SortDir = "asc" | "desc";
    type SortKey = "tonerSerial" | "name" | "model" | "vendor" | "origin" | "createdAt" | "location" | "status";

    const [sortKey, setSortKey] = useState<SortKey>("tonerSerial");
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

    function normUpper(s: string) {
        return (s || "").trim().toUpperCase();
    }

    useEffect(() => {
        reload();
        loadAllTonerData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, origin, createdAt, location, active]);

    // Load semua data saat component mount
    useEffect(() => {
        loadAllTonerData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sorting
    const sortedItems = useMemo(() => {
        const arr = [...items];

        arr.sort((x: any, y: any) => {
            const ax =
                sortKey === "tonerSerial" ? x.tonerSerial :
                    sortKey === "name" ? x.name :
                        sortKey === "model" ? (x.model || "") :
                            sortKey === "vendor" ? (x.vendor || "") :
                                sortKey === "origin" ? (x.origin || "") :
                                    sortKey === "createdAt" ? (x.createdAt || "") :
                                        sortKey === "location" ? (x.location || "") :
                                            (x.status || "");

            const ay =
                sortKey === "tonerSerial" ? y.tonerSerial :
                    sortKey === "name" ? y.name :
                        sortKey === "model" ? (y.model || "") :
                            sortKey === "vendor" ? (y.vendor || "") :
                                sortKey === "origin" ? (y.origin || "") :
                                    sortKey === "createdAt" ? (y.createdAt || "") :
                                        sortKey === "location" ? (y.location || "") :
                                            (y.status || "");

            const r = cmp(ax, ay);
            return sortDir === "asc" ? r : -r;
        });

        return arr;
    }, [items, sortKey, sortDir]);

    // Pagination
    useEffect(() => {
        setPage(1);
    }, [search, status, origin, createdAt, location, active, pageSize]);

    const total = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    const pagedItems = sortedItems.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    function openAdd() {
        // Generate serial otomatis
        getNextTonerSerial().then(({ nextSerial }) => {
            setForm({
                ...defaultForm,
                tonerSerial: nextSerial,
            });
            setFormOpen(true);
        }).catch(() => {
            setForm(defaultForm);
            setFormOpen(true);
        });
    }

    function openEdit(t: Toner) {
        setForm({
            id: t.id,
            tonerSerial: (t.tonerSerial || ""),
            name: (t.name || "").toUpperCase(),
            model: (t.model || "").toUpperCase(),
            vendor: (t.vendor || "").toUpperCase(),
            origin: (t.origin || "").toUpperCase(),
            location: (t.location || "").toUpperCase(),
            status: t.status,
            notes: (t.notes || "").toUpperCase(),
        });
        setFormOpen(true);
    }

    function openMove(t: Toner) {
        setMoveTarget(t);
        // Reset form dengan lokasi sesuai status awal
        let initialLocation = t.location || "";

        // Jika status awal adalah ON_PROGRESS atau FINISH, set lokasi sesuai
        if (t.status === "ON_PROGRESS") {
            initialLocation = t.vendor || "";
        } else if (t.status === "FINISH") {
            initialLocation = t.origin || "";
        }

        setMoveForm({
            status: t.status,
            location: initialLocation,
            notes: (t.notes || "").toUpperCase(),
        });
        setMoveOpen(true);
    }

    async function submitForm(e: React.FormEvent) {
        e.preventDefault();

        const payload: Partial<Toner> = {
            tonerSerial: form.tonerSerial,
            name: normUpper(form.name),
            model: normUpper(form.model),
            vendor: normUpper(form.vendor),
            origin: normUpper(form.origin),
            location: normUpper(form.location),
            status: form.status,
            notes: normUpper(form.notes),
        };

        try {
            if (!payload.name) {
                toast.error("Nama wajib diisi");
                return;
            }

            if (!payload.location) {
                toast.error("Lokasi sekarang wajib diisi");
                return;
            }

            if (form.id) {
                await updateToner(form.id, payload);
                toast.success("Toner berhasil disimpan");
            } else {
                await createToner(payload);
                toast.success("Toner berhasil ditambahkan");
            }

            setFormOpen(false);
            await reload();
        } catch (e: any) {
            toast.error(e?.message || "Gagal simpan");
        }
    }

    async function submitMove(e: React.FormEvent) {
        e.preventDefault();
        if (!moveTarget) return;

        // Validasi untuk status PENDING
        if (moveForm.status === "PENDING" && !moveForm.location.trim()) {
            toast.error("Location wajib diisi untuk status PENDING");
            return;
        }

        // Tentukan lokasi berdasarkan status
        let finalLocation = moveForm.location;

        if (moveForm.status === "ON_PROGRESS") {
            finalLocation = moveTarget.vendor || "";
        } else if (moveForm.status === "FINISH") {
            finalLocation = moveTarget.origin || "";
        }

        const payload: TonerMoveRequest = {
            status: moveForm.status,
            location: normUpper(finalLocation),
            notes: normUpper(moveForm.notes),
        };

        try {
            await moveToner(moveTarget.id, payload);
            toast.success("Status dan lokasi toner berhasil diupdate");

            setMoveOpen(false);
            await reload();
        } catch (e: any) {
            toast.error(e?.message || "Gagal update toner");
        }
    }

    async function onDisable(t: Toner) {
        if (!canWrite) return;

        const reason = window.prompt(`Alasan nonaktifkan toner ${t.tonerSerial} - ${t.name}?`);
        if (!reason || !reason.trim()) return;

        try {
            await disableToner(t.id, { reason: reason.trim() });
            toast.success("Toner berhasil dinonaktifkan");
            await reload();
        } catch (e: any) {
            toast.error(e?.message || "Gagal nonaktifkan toner");
        }
    }

    async function onRestore(t: Toner) {
        if (!canWrite) return;

        try {
            await restoreToner(t.id);
            toast.success("Toner berhasil diaktifkan kembali");
            await reload();
        } catch (e: any) {
            toast.error(e?.message || "Gagal restore toner");
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
                            {" > Toner"}
                        </div>
                        <div style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: "var(--text-1)",
                            letterSpacing: "-0.02em"
                        }}>
                            Toner
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button style={buttonStyle()} onClick={reload}>
                            ↻ Refresh
                        </button>
                        {canWrite ? (
                            <button style={buttonStyle("primary")} onClick={openAdd}>
                                + Add Toner
                            </button>
                        ) : null}
                    </div>
                </div>

                <Card
                    title="Toner List"
                    right={
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                                style={{ ...inputStyle(), width: 240 }}
                                placeholder="Search toner ID / name / model..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") reload();
                                }}
                            />

                            {/* <div style={{ minWidth: 170 }}>
                                <DropdownSelect
                                    value={active}
                                    onChange={(v) => setActive(v)}
                                    options={[
                                        { value: "1", label: "ACTIVE" },
                                        { value: "0", label: "DISABLED" },
                                        { value: "all", label: "ALL" },
                                    ]}
                                />
                            </div> */}

                            <DropdownSelect<StatusFilterOption>
                                value={statusFilter}
                                onChange={(v) => setStatusFilter(v)}
                                options={[
                                    { value: "NOT_FINISH", label: "NOT FINISH" },
                                    { value: "ALL", label: "ALL" },
                                    { value: "PENDING", label: "PENDING" },
                                    { value: "ON_PROGRESS", label: "ON_PROGRESS" },
                                    { value: "FINISH", label: "FINISH" },
                                ]}
                                style={{ width: 180 }}
                            />

                            <div style={{ width: 180 }}>
                                <AutocompleteTextInput
                                    value={origin}
                                    onChange={(v) => setOrigin(v)}
                                    options={origins} // Semua origins
                                    placeholder="Asal Toner"
                                />
                            </div>

                            <div style={{ width: 180 }}>
                                <AutocompleteTextInput
                                    value={location}
                                    onChange={(v) => setLocation(v)}
                                    options={locationsOptions} // Semua locations
                                    placeholder="All Location"
                                />
                            </div>

                            {origin || location ? (
                                <button
                                    type="button"
                                    style={buttonStyle()}
                                    onClick={() => {
                                        setOrigin("");
                                        setLocation("");
                                    }}
                                    title="Clear filters"
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
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                            <thead>
                                <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                                    <th
                                        onClick={() => toggleSort("tonerSerial")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                    >
                                        Toner ID <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("tonerSerial")}</span>
                                    </th>

                                    <th
                                        onClick={() => toggleSort("name")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                    >
                                        Name <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("name")}</span>
                                    </th>

                                    <th
                                        onClick={() => toggleSort("model")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                    >
                                        Model <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("model")}</span>
                                    </th>

                                    <th
                                        onClick={() => toggleSort("vendor")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                    >
                                        Vendor <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("vendor")}</span>
                                    </th>

                                    <th onClick={() => toggleSort("origin")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}>
                                        Origin <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("origin")}</span>
                                    </th>

                                    <th onClick={() => toggleSort("createdAt")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}>
                                        Created Date <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("createdAt")}</span>
                                    </th>

                                    <th
                                        onClick={() => toggleSort("location")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                    >
                                        Location <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("location")}</span>
                                    </th>

                                    <th
                                        onClick={() => toggleSort("status")}
                                        style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                    >
                                        Status <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("status")}</span>
                                    </th>

                                    <th style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)" }}>
                                        Notes
                                    </th>

                                    <th style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)" }}>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {pagedItems.map((t) => {
                                    const tone =
                                        t.status === "PENDING" ? "blue" :
                                            t.status === "ON_PROGRESS" ? "amber" :
                                                "green";

                                    const isDisabled = (t as any).isActive === 0;

                                    return (
                                        <tr
                                            key={t.id}
                                            style={{ transition: "background 120ms ease" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        >
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-1)" }}>
                                                {t.tonerSerial}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-1)" }}>
                                                {(t.name || "").toUpperCase()}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                {(t.model || "-").toUpperCase()}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                {(t.vendor || "-").toUpperCase()}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                {t.origin || "-"}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                {t.createdAt || "-"}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                {(t.location || "-").toUpperCase()}
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                                                <Pill label={t.status} tone={tone as any} />
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                                                <NotesTooltip content={t.notes || ""}>
                                                    <div
                                                        style={{
                                                            width: "32px",
                                                            height: "32px",
                                                            borderRadius: "50%",
                                                            background: t.notes && t.notes.trim() !== ""
                                                                ? "linear-gradient(135deg, #0EA5E9, #3B82F6)"
                                                                : "var(--hover-1)",
                                                            color: t.notes && t.notes.trim() !== "" ? "#FFFFFF" : "var(--muted)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            cursor: t.notes && t.notes.trim() !== "" ? "pointer" : "default",
                                                            fontWeight: 900,
                                                            fontSize: "14px",
                                                            transition: "all 150ms ease",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (t.notes && t.notes.trim() !== "") {
                                                                e.currentTarget.style.transform = "scale(1.1)";
                                                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)";
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (t.notes && t.notes.trim() !== "") {
                                                                e.currentTarget.style.transform = "scale(1)";
                                                                e.currentTarget.style.boxShadow = "none";
                                                            }
                                                        }}
                                                    >
                                                        {t.notes && t.notes.trim() !== "" ? "📝" : "–"}
                                                    </div>
                                                </NotesTooltip>
                                            </td>
                                            <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                    {canWrite ? (
                                                        <>
                                                            <button
                                                                style={{
                                                                    ...buttonStyle(),
                                                                    opacity: t.status === "FINISH" ? 0.5 : 1,
                                                                    cursor: t.status === "FINISH" ? "not-allowed" : "pointer",
                                                                }}
                                                                onClick={() => t.status !== "FINISH" && openEdit(t)}
                                                                disabled={t.status === "FINISH"}
                                                                title={t.status === "FINISH" ? "Toner dengan status FINISH tidak bisa diedit" : "Edit"}
                                                            >
                                                                EDIT
                                                            </button>
                                                            <button
                                                                style={buttonStyle("primary")}
                                                                onClick={() => openMove(t)}
                                                                disabled={isDisabled}
                                                            >
                                                                MOVE
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: "var(--muted)", fontWeight: 800 }}>READ ONLY</span>
                                                    )}
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
                                width: "min(800px, 100%)",
                                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
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
                                    {form.id ? "EDIT TONER" : "ADD TONER"}
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
                                {/* Toner Serial - Disabled */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Field label="Toner ID">
                                        <input
                                            style={{
                                                ...inputStyle(),
                                                background: "var(--hover-1)",
                                                cursor: "not-allowed",
                                                color: "var(--muted)",
                                                fontWeight: 900,
                                            }}
                                            value={form.tonerSerial}
                                            readOnly
                                            disabled
                                        />
                                    </Field>
                                </div>

                                {/* Name dengan autocomplete */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Field label="Name">
                                        <AutocompleteTextInput
                                            value={form.name}
                                            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                                            options={names} // Semua names
                                            placeholder="Name"
                                            disabled={!canWrite}
                                        />
                                    </Field>
                                </div>

                                {/* Model dengan autocomplete */}
                                <div style={{ gridColumn: "span 4" }}>
                                    <Field label="Model Printer">
                                        <AutocompleteTextInput
                                            value={form.model}
                                            onChange={(v) => setForm((p) => ({ ...p, model: v }))}
                                            options={models} // Semua models
                                            placeholder="Model"
                                            disabled={!canWrite}
                                        />
                                    </Field>
                                </div>

                                {/* Vendor dengan autocomplete */}
                                <div style={{ gridColumn: "span 4" }}>
                                    <Field label="Vendor">
                                        <AutocompleteTextInput
                                            value={form.vendor}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: v }))}
                                            options={vendors} // Semua vendors
                                            placeholder="Vendor"
                                            disabled={!canWrite}
                                        />
                                    </Field>
                                </div>

                                {/* Origin dengan autocomplete */}
                                <div style={{ gridColumn: "span 4" }}>
                                    <Field label="Lokasi Asal">
                                        <AutocompleteTextInput
                                            value={form.origin}
                                            onChange={(v) => setForm((p) => ({ ...p, origin: v }))}
                                            options={origins} // Semua origins
                                            placeholder="Origin"
                                            disabled={!canWrite}
                                        />
                                    </Field>
                                </div>

                                {/* Location dengan autocomplete */}
                                <div style={{ gridColumn: "span 4" }}>
                                    <Field label="Lokasi Sekarang">
                                        {form.id ? (
                                            <div style={{
                                                ...inputStyle(),
                                                background: "var(--hover-1)",
                                                cursor: "not-allowed",
                                                color: "var(--muted)",
                                                fontWeight: 900,
                                                border: "1px solid var(--input-border)"
                                            }}>
                                                {(form.location || "-").toUpperCase()}
                                            </div>
                                        ) : (
                                            <AutocompleteTextInput
                                                value={form.location}
                                                onChange={(v) => setForm((p) => ({ ...p, location: v }))}
                                                options={locationsOptions}
                                                placeholder="Location"
                                                disabled={!canWrite}
                                            />
                                        )}
                                    </Field>
                                </div>

                                {/* Status */}
                                <div style={{ gridColumn: "span 4" }}>
                                    <Field label="Status">
                                        {form.id ? (
                                            <div style={{
                                                ...inputStyle(),
                                                background: "var(--hover-1)",
                                                cursor: "not-allowed",
                                                color: form.status === "PENDING" ? "#1D4ED8" :
                                                    form.status === "ON_PROGRESS" ? "#B45309" :
                                                        "#047857",
                                                fontWeight: 900,
                                                border: "1px solid var(--input-border)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between"
                                            }}>
                                                <span>{form.status}</span>
                                                <Pill
                                                    label={form.status}
                                                    tone={form.status === "PENDING" ? "blue" :
                                                        form.status === "ON_PROGRESS" ? "amber" :
                                                            "green"}
                                                />
                                            </div>
                                        ) : (
                                            <DropdownSelect
                                                value={form.status as any}
                                                onChange={(v) => setForm((p) => ({ ...p, status: v as any }))}
                                                options={[
                                                    { value: "PENDING" as any, label: "PENDING" },
                                                    { value: "ON_PROGRESS" as any, label: "ON_PROGRESS" },
                                                    { value: "FINISH" as any, label: "FINISH" },
                                                ]}
                                            />
                                        )}
                                    </Field>
                                </div>

                                {/* Notes */}
                                <div style={{ gridColumn: "span 4" }}>
                                    <Field label="Notes">
                                        <input
                                            style={inputStyle()}
                                            value={form.notes}
                                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                            placeholder="Notes"
                                        />
                                    </Field>
                                </div>

                                {/* Tombol Save/Cancel */}
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

                {/* Move Modal */}
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
                                width: "min(600px, 100%)",
                                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
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
                                    MOVE TONER
                                </div>
                                <IconCloseButton onClick={() => setMoveOpen(false)} />
                            </div>

                            <form
                                onSubmit={submitMove}
                                style={{
                                    padding: 16,
                                    display: "grid",
                                    gridTemplateColumns: "repeat(12, 1fr)",
                                    gap: 12,
                                    alignItems: "start",
                                }}
                            >
                                {/* Header Info */}
                                <div style={{ gridColumn: "span 12", fontWeight: 900, fontSize: 14, color: "var(--text-1)" }}>
                                    {moveTarget.tonerSerial} — {moveTarget.name}
                                </div>

                                {/* Current Details */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Field label="ORIGIN">
                                        <div style={{
                                            ...inputStyle(),
                                            background: "var(--hover-1)",
                                            cursor: "default",
                                            fontWeight: 900,
                                            color: "var(--text-1)"
                                        }}>
                                            {(moveTarget.origin || "-").toUpperCase()}
                                        </div>
                                    </Field>
                                </div>

                                <div style={{ gridColumn: "span 6" }}>
                                    <Field label="CURRENT LOCATION">
                                        <div style={{
                                            ...inputStyle(),
                                            background: "var(--hover-1)",
                                            cursor: "default",
                                            fontWeight: 800,
                                            color: "var(--text-2)"
                                        }}>
                                            {(moveTarget.location || "-").toUpperCase()}
                                        </div>
                                    </Field>
                                </div>

                                {/* Current Status */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Field label="CURRENT STATUS">
                                        <div style={{
                                            ...inputStyle(),
                                            background: "var(--hover-1)",
                                            cursor: "default",
                                            fontWeight: 900,
                                            color: moveTarget.status === "PENDING" ? "#1D4ED8" :
                                                moveTarget.status === "ON_PROGRESS" ? "#B45309" : "#047857"
                                        }}>
                                            {moveTarget.status}
                                        </div>
                                    </Field>
                                </div>

                                {/* New Status */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Field label="NEW STATUS">
                                        <DropdownSelect
                                            value={moveForm.status as any}
                                            onChange={(v) => {
                                                const newStatus = v as TonerStatus;
                                                setMoveForm((p) => {
                                                    let newLocation = p.location;
                                                    // Logika otomatis untuk lokasi berdasarkan status
                                                    if (newStatus === "ON_PROGRESS") {
                                                        newLocation = moveTarget.vendor || "";
                                                    } else if (newStatus === "FINISH") {
                                                        newLocation = moveTarget.origin || "";
                                                    } else if (newStatus === "PENDING") {
                                                        newLocation = ""; // Reset untuk pending
                                                    }
                                                    return { ...p, status: newStatus, location: newLocation };
                                                });
                                            }}
                                            options={[
                                                { value: "PENDING" as any, label: "PENDING" },
                                                { value: "ON_PROGRESS" as any, label: "ON_PROGRESS" },
                                                { value: "FINISH" as any, label: "FINISH" },
                                            ]}
                                        />
                                    </Field>
                                </div>

                                {/* Vendor Section (Tampil hanya saat ON_PROGRESS) */}
                                {moveForm.status === "ON_PROGRESS" && (
                                    <div style={{ gridColumn: "span 12" }}>
                                        <Field label="VENDOR LOCATION">
                                            <div style={{
                                                ...inputStyle(),
                                                background: "#FFFBEB",
                                                border: "1px solid #FDE68A",
                                                fontWeight: 900,
                                                color: "#B45309"
                                            }}>
                                                {(moveTarget.vendor || "-").toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800, marginTop: 4 }}>
                                                Location otomatis di-set ke vendor saat status ON PROGRESS
                                            </div>
                                        </Field>
                                    </div>
                                )}

                                {/* Origin Section (Tampil hanya saat FINISH) */}
                                {moveForm.status === "FINISH" && (
                                    <div style={{ gridColumn: "span 12" }}>
                                        <Field label="RETURN TO ORIGIN">
                                            <div style={{
                                                ...inputStyle(),
                                                background: "#ECFDF5",
                                                border: "1px solid #A7F3D0",
                                                fontWeight: 900,
                                                color: "#047857"
                                            }}>
                                                {(moveTarget.origin || "-").toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800, marginTop: 4 }}>
                                                Location otomatis di-set ke asal saat status FINISH
                                            </div>
                                        </Field>
                                    </div>
                                )}

                                {/* New Location Section (Tampil hanya saat PENDING atau status lain) */}
                                {(moveForm.status === "PENDING" ||
                                    (moveForm.status !== "ON_PROGRESS" && moveForm.status !== "FINISH")) && (
                                        <div style={{ gridColumn: "span 12" }}>
                                            <Field label="NEW LOCATION">
                                                <AutocompleteTextInput
                                                    value={moveForm.location}
                                                    onChange={(v) => setMoveForm((p) => ({ ...p, location: v }))}
                                                    options={locationsOptions} // Semua locations
                                                    placeholder={
                                                        moveForm.status === "PENDING"
                                                            ? "Wajib pilih atau input location untuk status PENDING"
                                                            : "Select Location"
                                                    }
                                                    disabled={!canWrite}
                                                />
                                                {moveForm.status === "PENDING" && (
                                                    <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 900, marginTop: 4 }}>
                                                        ⚠️ Location wajib diisi untuk status PENDING
                                                    </div>
                                                )}
                                            </Field>
                                        </div>
                                    )}

                                {/* Move Notes */}
                                <div style={{ gridColumn: "span 12" }}>
                                    <Field label="MOVE NOTES">
                                        <textarea
                                            style={{
                                                ...inputStyle(),
                                                height: "auto",
                                                minHeight: 80,
                                                resize: "vertical",
                                                fontFamily: "inherit",
                                            }}
                                            value={moveForm.notes}
                                            onChange={(e) => setMoveForm((p) => ({ ...p, notes: e.target.value }))}
                                            placeholder="Catatan perpindahan status/lokasi"
                                        />
                                    </Field>
                                </div>

                                {/* Tombol Apply Move dengan Validasi */}
                                <div
                                    style={{
                                        gridColumn: "span 12",
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 10,
                                        marginTop: 4,
                                    }}
                                >
                                    <button type="button" style={buttonStyle()} onClick={() => setMoveOpen(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            ...buttonStyle("primary"),
                                            opacity: (
                                                moveForm.status === "PENDING" && !moveForm.location.trim()
                                            ) ? 0.5 : 1,
                                            cursor: (
                                                moveForm.status === "PENDING" && !moveForm.location.trim()
                                            ) ? "not-allowed" : "pointer"
                                        }}
                                        disabled={moveForm.status === "PENDING" && !moveForm.location.trim()}
                                    >
                                        Apply Move
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}
            </div>
        </AppLayout>
    );
}