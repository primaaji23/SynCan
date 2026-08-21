import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "../layouts/AppLayout";
import {
    listAssets,
    listInventory,
    listToner,
    type Asset,
    type InventoryItem,
    type Toner,
    type AssetType,
    type AssetStatus,
    type InventoryCategory,
    type TonerStatus,
} from "../services/itService";
import { useToast } from "../components/ToastProvider";
import * as XLSX from "xlsx";

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

        ["--card-bg" as any]: dark ? "#2B313D" : "linear-gradient(180deg, rgba(239, 240, 250, 0.78) 0%, rgba(255, 255, 255, 0.96) 100%)",
        ["--card-border" as any]: dark ? "rgba(255,255,255,0.10)" : "rgba(30,64,175,0.12)",
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

function Card({
    title,
    children,
    right,
    style,
}: {
    title: string;
    children: React.ReactNode;
    right?: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <div
            style={{
                background: "var(--card-bg)",
                borderRadius: 14,
                boxShadow: "var(--card-shadow)",
                border: "1px solid var(--card-border)",
                overflow: "hidden",
                ...style,
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

function buttonStyle(
    variant: "primary" | "ghost" | "danger" | "success" = "ghost"
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
    if (variant === "success") {
        return {
            ...base,
            border: "1px solid #10B981",
            background: "#10B981",
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
    options: Array<{ value: T; label: string }>;
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
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

function ExportButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={buttonStyle("success")}
            title="Export to Excel"
        >
            📊 Export Excel
        </button>
    );
}

function StatCard({
    title,
    value,
    subtitle,
    color = "blue",
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: "blue" | "green" | "amber" | "purple";
}) {
    const colorMap = {
        blue: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
        green: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
        amber: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
        purple: { bg: "#F5F3FF", fg: "#6D28D9", bd: "#DDD6FE" },
    } as const;

    const c = colorMap[color];

    return (
        <div
            style={{
                background: "var(--card-bg)",
                borderRadius: 12,
                border: "1px solid var(--card-border)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "var(--card-shadow)",
            }}
        >
            <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 900, textTransform: "uppercase" }}>
                {title}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-1)" }}>{value}</div>
            {subtitle && (
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}

export default function ReportPage() {
    const theme = useSyncanTheme();
    const toast = useToast();

    // State untuk data
    const [assets, setAssets] = useState<Asset[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [toners, setToners] = useState<Toner[]>([]);
    const [loading, setLoading] = useState(false);

    // State untuk filter tanggal
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // State untuk pilihan report
    const [reportType, setReportType] = useState<
        "inventory-category" | "inventory-status" | "inventory-location" |
        "assets-type" | "assets-status" |
        "toner-status" | "toner-origin"
    >("inventory-category");

    // Fungsi untuk load data
    async function loadData() {
        setLoading(true);
        try {
            const [assetsData, inventoryData, tonersData] = await Promise.all([
                listAssets({ active: "all" }),
                listInventory({ active: "all" }),
                listToner({ active: "all" }),
            ]);

            // Filter berdasarkan tanggal jika ada
            const filterByDate = <T extends { createdAt?: string }>(items: T[]): T[] => {
                if (!startDate && !endDate) return items;

                return items.filter(item => {
                    const itemDate = item.createdAt ? new Date(item.createdAt) : null;
                    if (!itemDate) return false;

                    if (startDate && itemDate < new Date(startDate)) return false;
                    if (endDate && itemDate > new Date(endDate + "T23:59:59")) return false;

                    return true;
                });
            };

            setAssets(filterByDate(assetsData));
            setInventory(filterByDate(inventoryData));
            setToners(filterByDate(tonersData));

            toast.success("Data report berhasil dimuat");
        } catch (e: any) {
            toast.error(e?.message || "Gagal memuat data report");
        } finally {
            setLoading(false);
        }
    }

    // Load data saat pertama kali render
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fungsi untuk generate report berdasarkan tipe
    const reportData = useMemo(() => {
        switch (reportType) {
            // Inventory Reports
            case "inventory-category": {
                const categories: Record<string, number> = {};
                inventory.forEach(item => {
                    const cat = item.category || "UNKNOWN";
                    categories[cat] = (categories[cat] || 0) + 1;
                });
                return Object.entries(categories).map(([category, count]) => ({
                    category,
                    count,
                    percentage: ((count / inventory.length) * 100).toFixed(1) + "%",
                }));
            }

            case "inventory-status": {
                const statusCount: Record<string, number> = {};
                inventory.forEach(item => {
                    const isLow = (item.stock ?? 0) < (item.minStock ?? 0);
                    const isDisabled = (item as any).isActive === 0;
                    let status = "OK";
                    if (isDisabled) status = "DISABLED";
                    else if (isLow) status = "LOW";

                    statusCount[status] = (statusCount[status] || 0) + 1;
                });
                return Object.entries(statusCount).map(([status, count]) => ({
                    status,
                    count,
                    percentage: ((count / inventory.length) * 100).toFixed(1) + "%",
                }));
            }

            case "inventory-location": {
                const locations: Record<string, number> = {};
                inventory.forEach(item => {
                    const loc = item.location || "UNKNOWN";
                    locations[loc] = (locations[loc] || 0) + 1;
                });
                return Object.entries(locations)
                    .map(([location, count]) => ({
                        location,
                        count,
                        percentage: ((count / inventory.length) * 100).toFixed(1) + "%",
                    }))
                    .sort((a, b) => b.count - a.count);
            }

            // Assets Reports
            case "assets-type": {
                const types: Record<string, number> = {};
                assets.forEach(asset => {
                    const type = asset.type || "UNKNOWN";
                    types[type] = (types[type] || 0) + 1;
                });
                return Object.entries(types).map(([type, count]) => ({
                    type,
                    count,
                    percentage: ((count / assets.length) * 100).toFixed(1) + "%",
                }));
            }

            case "assets-status": {
                const statuses: Record<string, number> = {};
                assets.forEach(asset => {
                    const status = asset.status || "UNKNOWN";
                    statuses[status] = (statuses[status] || 0) + 1;
                });
                return Object.entries(statuses).map(([status, count]) => ({
                    status,
                    count,
                    percentage: ((count / assets.length) * 100).toFixed(1) + "%",
                }));
            }

            // Toner Reports
            case "toner-status": {
                const statuses: Record<string, number> = {};
                toners.forEach(toner => {
                    const status = toner.status || "UNKNOWN";
                    statuses[status] = (statuses[status] || 0) + 1;
                });
                return Object.entries(statuses).map(([status, count]) => ({
                    status,
                    count,
                    percentage: ((count / toners.length) * 100).toFixed(1) + "%",
                }));
            }

            case "toner-origin": {
                const origins: Record<string, number> = {};
                toners.forEach(toner => {
                    const origin = toner.origin || "UNKNOWN";
                    origins[origin] = (origins[origin] || 0) + 1;
                });
                return Object.entries(origins)
                    .map(([origin, count]) => ({
                        origin,
                        count,
                        percentage: ((count / toners.length) * 100).toFixed(1) + "%",
                    }))
                    .sort((a, b) => b.count - a.count);
            }

            default:
                return [];
        }
    }, [reportType, assets, inventory, toners]);

    // Fungsi untuk export ke Excel
    const exportToExcel = () => {
        try {
            // Siapkan data untuk export
            const exportData = reportData.map((item: any) => {
                const baseRow: any = {};

                switch (reportType) {
                    case "inventory-category":
                        baseRow["Kategori"] = item.category;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;

                    case "inventory-status":
                        baseRow["Status"] = item.status;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;

                    case "inventory-location":
                        baseRow["Lokasi"] = item.location;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;

                    case "assets-type":
                        baseRow["Tipe Asset"] = item.type;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;

                    case "assets-status":
                        baseRow["Status Asset"] = item.status;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;

                    case "toner-status":
                        baseRow["Status Toner"] = item.status;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;

                    case "toner-origin":
                        baseRow["Asal Toner"] = item.origin;
                        baseRow["Jumlah"] = item.count;
                        baseRow["Persentase"] = item.percentage;
                        break;
                }

                return baseRow;
            });

            // Tambahkan summary jika data tersedia
            const summarySheet = [];
            if (startDate || endDate) {
                summarySheet.push({
                    "Filter Tanggal": `${startDate || "Semua"} - ${endDate || "Semua"}`,
                });
            }
            summarySheet.push({
                "Total Data": exportData.reduce((sum, item) => sum + (item.Jumlah || 0), 0),
                "Jumlah Kategori": exportData.length,
            });

            // Buat workbook
            const wb = XLSX.utils.book_new();

            // Tambahkan sheet data utama
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, "Report Data");

            // Tambahkan sheet summary
            const wsSummary = XLSX.utils.json_to_sheet(summarySheet);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // Generate nama file berdasarkan tipe report
            const reportTypeMap: Record<string, string> = {
                "inventory-category": "Report_Kategori_Inventory",
                "inventory-status": "Report_Status_Inventory",
                "inventory-location": "Report_Lokasi_Inventory",
                "assets-type": "Report_Tipe_Assets",
                "assets-status": "Report_Status_Assets",
                "toner-status": "Report_Status_Toner",
                "toner-origin": "Report_Asal_Toner",
            };

            const fileName = `${reportTypeMap[reportType]}_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Download file
            XLSX.writeFile(wb, fileName);

            toast.success(`Report berhasil diexport ke ${fileName}`);
        } catch (error) {
            toast.error("Gagal export ke Excel");
            console.error("Export error:", error);
        }
    };

    // Render judul report berdasarkan tipe
    const getReportTitle = () => {
        switch (reportType) {
            case "inventory-category": return "Report Inventory by Kategori";
            case "inventory-status": return "Report Inventory by Status";
            case "inventory-location": return "Report Inventory by Lokasi";
            case "assets-type": return "Report Assets by Type";
            case "assets-status": return "Report Assets by Status";
            case "toner-status": return "Report Toner by Status";
            case "toner-origin": return "Report Toner by Origin";
            default: return "Report";
        }
    };

    // Render kolom tabel berdasarkan tipe
    const getTableHeaders = () => {
        switch (reportType) {
            case "inventory-category": return ["Kategori", "Jumlah", "Persentase"];
            case "inventory-status": return ["Status", "Jumlah", "Persentase"];
            case "inventory-location": return ["Lokasi", "Jumlah", "Persentase"];
            case "assets-type": return ["Tipe Asset", "Jumlah", "Persentase"];
            case "assets-status": return ["Status Asset", "Jumlah", "Persentase"];
            case "toner-status": return ["Status Toner", "Jumlah", "Persentase"];
            case "toner-origin": return ["Asal Toner", "Jumlah", "Persentase"];
            default: return [];
        }
    };

    // Render data baris berdasarkan tipe
    const getRowData = (item: any) => {
        switch (reportType) {
            case "inventory-category": return [item.category, item.count, item.percentage];
            case "inventory-status": return [item.status, item.count, item.percentage];
            case "inventory-location": return [item.location, item.count, item.percentage];
            case "assets-type": return [item.type, item.count, item.percentage];
            case "assets-status": return [item.status, item.count, item.percentage];
            case "toner-status": return [item.status, item.count, item.percentage];
            case "toner-origin": return [item.origin, item.count, item.percentage];
            default: return [];
        }
    };

    // Fungsi untuk reset filter
    const resetFilters = () => {
        setStartDate("");
        setEndDate("");
        setReportType("inventory-category");
    };

    return (
        <AppLayout>
            <div style={useThemeVars(theme)}>
                {/* Header */}
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
                            {" > Report"}
                        </div>
                        <div style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: "var(--text-1)",
                            letterSpacing: "-0.02em"
                        }}>
                            Report
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button style={buttonStyle()} onClick={loadData}>
                            ↻ Refresh
                        </button>
                        <ExportButton onClick={exportToExcel} />
                    </div>
                </div>

                {/* Stat Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
                    <StatCard
                        title="Total Assets"
                        value={assets.length}
                        subtitle={`${assets.filter(a => (a as any).isActive !== 0).length} aktif`}
                        color="blue"
                    />
                    <StatCard
                        title="Total Inventory"
                        value={inventory.length}
                        subtitle={`${inventory.reduce((sum, item) => sum + (item.stock || 0), 0)} total stock`}
                        color="green"
                    />
                    <StatCard
                        title="Total Toner"
                        value={toners.length}
                        subtitle={`${toners.filter(t => t.status === "PENDING").length} pending`}
                        color="amber"
                    />
                    <StatCard
                        title="Filter Tanggal"
                        value={startDate && endDate ? "Aktif" : "Semua"}
                        subtitle={`${startDate || "Semua"} - ${endDate || "Semua"}`}
                        color="purple"
                    />
                </div>

                {/* Filter Section */}
                <Card title="Filter Report" style={{ marginBottom: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                        {/* Filter Tanggal */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-2)", marginBottom: 6 }}>
                                Tanggal Awal
                            </div>
                            <input
                                type="date"
                                style={inputStyle()}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-2)", marginBottom: 6 }}>
                                Tanggal Akhir
                            </div>
                            <input
                                type="date"
                                style={inputStyle()}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        {/* Tombol Apply dan Reset */}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                            <button
                                style={buttonStyle("primary")}
                                onClick={loadData}
                            >
                                Apply Filter
                            </button>
                            <button
                                style={buttonStyle()}
                                onClick={resetFilters}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Report Type Selection */}
                <Card title="Pilih Jenis Report" style={{ marginBottom: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                        <button
                            style={{
                                ...buttonStyle(reportType === "inventory-category" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("inventory-category")}
                        >
                            Inventory by Kategori
                        </button>

                        <button
                            style={{
                                ...buttonStyle(reportType === "inventory-status" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("inventory-status")}
                        >
                            Inventory by Status
                        </button>

                        <button
                            style={{
                                ...buttonStyle(reportType === "inventory-location" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("inventory-location")}
                        >
                            Inventory by Lokasi
                        </button>

                        <button
                            style={{
                                ...buttonStyle(reportType === "assets-type" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("assets-type")}
                        >
                            Assets by Type
                        </button>

                        <button
                            style={{
                                ...buttonStyle(reportType === "assets-status" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("assets-status")}
                        >
                            Assets by Status
                        </button>

                        <button
                            style={{
                                ...buttonStyle(reportType === "toner-status" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("toner-status")}
                        >
                            Toner by Status
                        </button>

                        <button
                            style={{
                                ...buttonStyle(reportType === "toner-origin" ? "primary" : "ghost"),
                                textAlign: "left",
                                whiteSpace: "normal",
                                height: "auto",
                                minHeight: 60,
                            }}
                            onClick={() => setReportType("toner-origin")}
                        >
                            Toner by Origin
                        </button>
                    </div>
                </Card>

                {/* Report Results */}
                <Card
                    title={getReportTitle()}
                    right={
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 900 }}>
                                Total: {reportData.length} items
                            </div>
                            <ExportButton onClick={exportToExcel} />
                        </div>
                    }
                >
                    {loading ? (
                        <div style={{ textAlign: "center", padding: 40, color: "var(--text-2)", fontWeight: 800 }}>
                            Loading report data...
                        </div>
                    ) : reportData.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontWeight: 800 }}>
                            Tidak ada data untuk report ini
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                                        {getTableHeaders().map((header, index) => (
                                            <th
                                                key={index}
                                                style={{
                                                    padding: "12px 8px",
                                                    borderBottom: "1px solid var(--card-divider)",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((item: any, index: number) => (
                                        <tr
                                            key={index}
                                            style={{ transition: "background 120ms ease" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        >
                                            {getRowData(item).map((cell, cellIndex) => (
                                                <td
                                                    key={cellIndex}
                                                    style={{
                                                        padding: "12px 8px",
                                                        borderBottom: "1px solid var(--table-border)",
                                                        fontWeight: cellIndex === 0 ? 900 : 800,
                                                        color: cellIndex === 0 ? "var(--text-1)" : "var(--text-2)",
                                                    }}
                                                >
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* Information */}
                <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-2)", marginBottom: 4 }}>
                        Informasi Report
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>
                        • Report ini menampilkan data berdasarkan filter tanggal dan jenis report yang dipilih
                        <br />
                        • Klik tombol "Export Excel" untuk mengunduh data dalam format spreadsheet
                        <br />
                        • Data termasuk semua item (aktif dan non-aktif) kecuali difilter
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}