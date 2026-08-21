import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { isAdmin, getCurrentUser as getAuthUser } from "../auth/auth";
import {
    getCurrentUser,
    listUsers,
    createUser,
    updateUser,
    disableUser,
    restoreUser,
    changePassword,
    type User,
    type UserRole,
    type UserCreateRequest,
    type UserUpdateRequest,
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

function Pill({ label, tone }: { label: string; tone: "green" | "red" | "blue" | "gray" }) {
    const map = {
        green: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
        red: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
        blue: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
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

type UserFormState = {
    id?: string;
    username: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
};

const defaultUserForm: UserFormState = {
    username: "",
    password: "",
    confirmPassword: "",
    role: "user",
};

type ProfileFormState = {
    username: string;
    displayName: string;
    newPassword: string;
    confirmPassword: string;
};

const defaultProfileForm: ProfileFormState = {
    username: "",
    displayName: "",
    newPassword: "",
    confirmPassword: "",
};

export default function ProfilePage() {
    const theme = useSyncanTheme();
    const toast = useToast();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [search, setSearch] = useState("");
    const [role, setRole] = useState<UserRole | "">("");
    const [active, setActive] = useState<"1" | "0" | "all">("1");

    const [userFormOpen, setUserFormOpen] = useState(false);
    const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm);

    const [profileFormOpen, setProfileFormOpen] = useState(false);
    const [profileForm, setProfileForm] = useState<ProfileFormState>(defaultProfileForm);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const isSuperAdmin = currentUser?.username === "admin" || currentUser?.username === "root";
    const canManageUsers = isAdmin() && isSuperAdmin;

    const [passwordErrors, setPasswordErrors] = useState({
        new: '',
        confirm: ''
    });
    const [isValidatingPassword, setIsValidatingPassword] = useState(false);

    async function loadCurrentUser() {
        try {
            const user = await getCurrentUser();
            setCurrentUser(user);
        } catch (e: any) {
            toast.error(e?.message || "Gagal load data user");
        }
    }

    async function loadUsers() {
        if (!canManageUsers) return;

        setLoadingUsers(true);
        try {
            const data = await listUsers({ search, role, active });
            setUsers(data);
        } catch (e: any) {
            toast.error(e?.message || "Gagal load user list");
        } finally {
            setLoadingUsers(false);
        }
    }

    useEffect(() => {
        loadCurrentUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (canManageUsers) {
            loadUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, role, active, canManageUsers]);

    // Sorting
    type SortDir = "asc" | "desc";
    type SortKey = "username" | "role" | "createdAt" | "status";

    const [sortKey, setSortKey] = useState<SortKey>("username");
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

    const sortedUsers = useMemo(() => {
        const arr = [...users];

        arr.sort((x: any, y: any) => {
            const ax =
                sortKey === "username" ? x.username :
                    sortKey === "role" ? x.role :
                        sortKey === "createdAt" ? (x.createdAt || "") :
                            (x.isActive === 0 ? 2 : 1);

            const ay =
                sortKey === "username" ? y.username :
                    sortKey === "role" ? y.role :
                        sortKey === "createdAt" ? (y.createdAt || "") :
                            (y.isActive === 0 ? 2 : 1);

            const r = cmp(ax, ay);
            return sortDir === "asc" ? r : -r;
        });

        return arr;
    }, [users, sortKey, sortDir]);

    // Pagination
    useEffect(() => {
        setPage(1);
    }, [search, role, active, pageSize]);

    const total = sortedUsers.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    const pagedUsers = sortedUsers.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    function openAddUser() {
        setUserForm(defaultUserForm);
        setUserFormOpen(true);
    }

    function openEditUser(user: User) {
        setUserForm({
            id: user.id,
            username: user.username,
            password: "",
            confirmPassword: "",
            role: user.role,
        });
        setUserFormOpen(true);
    }

    function openEditProfile() {
        setProfileForm({
            username: currentUser?.username || "",
            displayName: currentUser?.username || "",
            newPassword: "",
            confirmPassword: "",
        });
        setProfileFormOpen(true);
    }

    useEffect(() => {
        // Real-time confirm password validation
        if (profileForm.newPassword && profileForm.confirmPassword) {
            if (profileForm.newPassword !== profileForm.confirmPassword) {
                setPasswordErrors(prev => ({
                    ...prev,
                    confirm: 'Passwords do not match'
                }));
            } else {
                setPasswordErrors(prev => ({ ...prev, confirm: '' }));
            }
        }

        // Real-time new password length validation
        if (profileForm.newPassword && profileForm.newPassword.length > 0) {
            if (profileForm.newPassword.length < 4) {
                setPasswordErrors(prev => ({
                    ...prev,
                    new: 'Password must be at least 4 characters'
                }));
            } else {
                setPasswordErrors(prev => ({ ...prev, new: '' }));
            }
        }
    }, [profileForm.newPassword, profileForm.confirmPassword]);

    async function submitUserForm(e: React.FormEvent) {
        e.preventDefault();

        if (!userForm.username.trim()) {
            toast.error("Username wajib diisi");
            return;
        }

        if (userForm.id) {
            // Edit existing user
            if (userForm.password && userForm.password !== userForm.confirmPassword) {
                toast.error("Password dan konfirmasi password tidak sama");
                return;
            }

            const payload: UserUpdateRequest = {
                username: userForm.username,
                role: userForm.role,
            };

            if (userForm.password) {
                payload.password = userForm.password;
            }

            try {
                await updateUser(userForm.id, payload);
                toast.success("User berhasil diupdate");
                setUserFormOpen(false);
                await loadUsers();
                // If editing current user, reload current user info
                if (currentUser && userForm.id === currentUser.id) {
                    await loadCurrentUser();
                }
            } catch (e: any) {
                toast.error(e?.message || "Gagal update user");
            }
        } else {
            // Create new user
            if (!userForm.password) {
                toast.error("Password wajib diisi");
                return;
            }

            if (userForm.password !== userForm.confirmPassword) {
                toast.error("Password dan konfirmasi password tidak sama");
                return;
            }

            const payload: UserCreateRequest = {
                username: userForm.username,
                password: userForm.password,
                role: userForm.role,
            };

            try {
                await createUser(payload);
                toast.success("User berhasil ditambahkan");
                setUserFormOpen(false);
                await loadUsers();
            } catch (e: any) {
                toast.error(e?.message || "Gagal tambah user");
            }
        }
    }

    async function submitProfileForm(e: React.FormEvent) {
        e.preventDefault();

        if (!currentUser) return;

        // Reset errors
        setPasswordErrors({ new: '', confirm: '' });

        const hasPasswordFields = profileForm.newPassword || profileForm.confirmPassword;

        // Jika ada field password yang diisi
        if (hasPasswordFields) {
            // Validasi: kedua field password harus diisi
            if (!profileForm.newPassword || !profileForm.confirmPassword) {
                setPasswordErrors({
                    new: !profileForm.newPassword ? 'New password is required' : '',
                    confirm: !profileForm.confirmPassword ? 'Confirm password is required' : ''
                });
                return;
            }

            // Validasi: new password minimal 4 karakter
            if (profileForm.newPassword.length < 4) {
                setPasswordErrors(prev => ({
                    ...prev,
                    new: 'Password must be at least 4 characters'
                }));
                return;
            }

            // Validasi: new password dan confirm harus sama
            if (profileForm.newPassword !== profileForm.confirmPassword) {
                setPasswordErrors(prev => ({
                    ...prev,
                    confirm: 'New passwords do not match'
                }));
                return;
            }
        }

        try {
            // Jika mengubah password
            if (hasPasswordFields) {
                const response = await changePassword(currentUser.id, {
                    newPassword: profileForm.newPassword
                });

                if (response.success) {
                    toast.success("Password changed successfully");
                    setProfileFormOpen(false);

                    // Reset form
                    setProfileForm({
                        username: currentUser.username,
                        displayName: currentUser.username,
                        newPassword: "",
                        confirmPassword: "",
                    });

                    // Reset errors
                    setPasswordErrors({ new: '', confirm: '' });
                }
            } else {
                // Jika tidak mengubah password, hanya tutup modal
                toast.info("No changes made");
                setProfileFormOpen(false);
            }
        } catch (e: any) {
            console.error("Change password error:", e);
            toast.error(e?.message || "Failed to change password");
        }
    }

    async function onDisableUser(user: User) {
        if (!canManageUsers) return;

        const reason = window.prompt(`Alasan nonaktifkan user ${user.username}?`);
        if (!reason || !reason.trim()) return;

        try {
            await disableUser(user.id, { reason: reason.trim() });
            toast.success("User berhasil dinonaktifkan");
            await loadUsers();
        } catch (e: any) {
            toast.error(e?.message || "Gagal nonaktifkan user");
        }
    }

    async function onRestoreUser(user: User) {
        if (!canManageUsers) return;

        try {
            await restoreUser(user.id);
            toast.success("User berhasil diaktifkan kembali");
            await loadUsers();
        } catch (e: any) {
            toast.error(e?.message || "Gagal restore user");
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
                            {" > Profile"}
                        </div>
                        <div style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: "var(--text-1)",
                            letterSpacing: "-0.02em"
                        }}>
                            Profile
                        </div>
                    </div>
                </div>

                {/* Current User Info Card */}
                <Card title="My Profile">
                    {currentUser ? (
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 32
                        }}>
                            {/* Left: User Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, 1fr)",
                                    gap: 16
                                }}>
                                    <div>
                                        <Label>Username</Label>
                                        <div style={{
                                            ...inputStyle(),
                                            background: "var(--hover-1)",
                                            cursor: "default",
                                            padding: "10px 14px",
                                            marginTop: 4,
                                            fontSize: "14px"
                                        }}>
                                            {currentUser.username}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Role</Label>
                                        <div style={{
                                            ...inputStyle(),
                                            background: "var(--hover-1)",
                                            cursor: "default",
                                            padding: "10px 14px",
                                            marginTop: 4,
                                            fontSize: "14px"
                                        }}>
                                            {currentUser.role.toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Account Created</Label>
                                        <div style={{
                                            ...inputStyle(),
                                            background: "var(--hover-1)",
                                            cursor: "default",
                                            padding: "10px 14px",
                                            marginTop: 4,
                                            fontSize: "14px"
                                        }}>
                                            {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('id-ID') : "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <div style={{ marginTop: 12 }}>
                                            <Pill
                                                label={currentUser.isActive === 0 ? "DISABLED" : "ACTIVE"}
                                                tone={currentUser.isActive === 0 ? "red" : "green"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Edit Button with Icon */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: "140px"
                            }}>
                                <button
                                    style={{
                                        ...buttonStyle("primary"),
                                        width: "160px",
                                        height: "40px",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                    }}
                                    onClick={openEditProfile}
                                >
                                    {/* Edit Icon */}
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                    </svg>
                                    EDIT PROFILE
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: "var(--muted)", fontWeight: 800 }}>Loading profile...</div>
                    )}
                </Card>

                <div style={{ height: 16 }} />

                {/* User Management Section (only for super admin) */}
                {canManageUsers && (
                    <Card
                        title="User Management"
                        right={
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <input
                                    style={{ ...inputStyle(), width: 200 }}
                                    placeholder="Search username"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />

                                <DropdownSelect
                                    value={active}
                                    onChange={(v) => setActive(v)}
                                    options={[
                                        { value: "1", label: "ACTIVE" },
                                        { value: "0", label: "DISABLED" },
                                        { value: "all", label: "ALL" },
                                    ]}
                                    style={{ width: 150 }}
                                />

                                <DropdownSelect
                                    value={role as any}
                                    onChange={(v) => setRole(v as any)}
                                    options={[
                                        { value: "" as any, label: "All Role" },
                                        { value: "admin" as any, label: "ADMIN" },
                                        { value: "user" as any, label: "USER" },
                                    ]}
                                    style={{ width: 140 }}
                                />

                                <button style={buttonStyle("primary")} onClick={openAddUser}>
                                    + Add User
                                </button>
                            </div>
                        }
                    >
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                                        <th
                                            onClick={() => toggleSort("username")}
                                            style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                        >
                                            Username <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("username")}</span>
                                        </th>

                                        <th
                                            onClick={() => toggleSort("role")}
                                            style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                        >
                                            Role <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("role")}</span>
                                        </th>

                                        <th
                                            onClick={() => toggleSort("createdAt")}
                                            style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                        >
                                            Created <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("createdAt")}</span>
                                        </th>

                                        <th
                                            onClick={() => toggleSort("status")}
                                            style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)", cursor: "pointer", userSelect: "none" }}
                                        >
                                            Status <span style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 900 }}>{sortIcon("status")}</span>
                                        </th>

                                        <th style={{ padding: "10px 8px", borderBottom: "1px solid var(--card-divider)" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedUsers.map((user) => {
                                        const isDisabled = user.isActive === 0;
                                        const isCurrentUser = currentUser && user.id === currentUser.id;

                                        return (
                                            <tr
                                                key={user.id}
                                                style={{ transition: "background 120ms ease" }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 900, color: "var(--text-1)" }}>
                                                    {user.username}
                                                    {isCurrentUser && <span style={{ marginLeft: 8, color: "#0EA5E9", fontSize: 11, fontWeight: 800 }}>(YOU)</span>}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                    {user.role.toUpperCase()}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)", fontWeight: 800, color: "var(--text-2)" }}>
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : "-"}
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                                                    <Pill label={isDisabled ? "DISABLED" : "ACTIVE"} tone={isDisabled ? "red" : "green"} />
                                                </td>
                                                <td style={{ padding: "10px 8px", borderBottom: "1px solid var(--table-border)" }}>
                                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                        <button style={buttonStyle()} onClick={() => openEditUser(user)} disabled={isCurrentUser}>
                                                            EDIT
                                                        </button>

                                                        {isDisabled ? (
                                                            <button style={buttonStyle("primary")} onClick={() => onRestoreUser(user)}>
                                                                RESTORE
                                                            </button>
                                                        ) : (
                                                            <button
                                                                style={buttonStyle("danger")}
                                                                onClick={() => onDisableUser(user)}
                                                                disabled={isCurrentUser}
                                                            >
                                                                DISABLE
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 12,
                                paddingTop: 10,
                                borderTop: "1px solid var(--card-divider)",
                            }}>
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

                            {loadingUsers ? (
                                <div style={{ marginTop: 10, color: "var(--text-2)", fontWeight: 800 }}>Loading users...</div>
                            ) : users.length === 0 ? (
                                <div style={{ marginTop: 10, color: "var(--muted)", fontWeight: 800 }}>No users found.</div>
                            ) : null}
                        </div>
                    </Card>
                )}

                {/* Add/Edit User Modal */}
                {userFormOpen && (
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
                        onMouseDown={() => setUserFormOpen(false)}
                    >
                        <div
                            style={{
                                background: "var(--card-bg)",
                                borderRadius: 14,
                                width: "min(500px, 100%)",
                                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div style={{ padding: 16, borderBottom: "1px solid var(--card-divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                                    {userForm.id ? "EDIT USER" : "ADD USER"}
                                </div>
                                <IconCloseButton onClick={() => setUserFormOpen(false)} />
                            </div>

                            <form
                                onSubmit={submitUserForm}
                                style={{
                                    padding: 16,
                                    display: "grid",
                                    gridTemplateColumns: "repeat(12, 1fr)",
                                    gap: 14,
                                    alignItems: "start",
                                }}
                            >
                                <div style={{ gridColumn: "span 12" }}>
                                    <Label>Username</Label>
                                    <input
                                        style={inputStyle()}
                                        value={userForm.username}
                                        onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                                        disabled={userForm.id !== undefined && currentUser?.username !== "admin" && currentUser?.username !== "root"}
                                    />
                                    {userForm.id !== undefined && currentUser?.username !== "admin" && currentUser?.username !== "root" && (
                                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800, marginTop: 4 }}>
                                            Username cannot be changed
                                        </div>
                                    )}
                                </div>

                                <div style={{ gridColumn: "span 6" }}>
                                    <Label>Password {userForm.id ? "(leave blank to keep unchanged)" : ""}</Label>
                                    <input
                                        style={inputStyle()}
                                        type="password"
                                        value={userForm.password}
                                        onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                                    />
                                </div>

                                <div style={{ gridColumn: "span 6" }}>
                                    <Label>Confirm Password</Label>
                                    <input
                                        style={inputStyle()}
                                        type="password"
                                        value={userForm.confirmPassword}
                                        onChange={(e) => setUserForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                                    />
                                </div>

                                <div style={{ gridColumn: "span 6" }}>
                                    <Label>Role</Label>
                                    <DropdownSelect
                                        value={userForm.role as any}
                                        onChange={(v) => setUserForm((p) => ({ ...p, role: v as UserRole }))}
                                        options={[
                                            { value: "admin" as any, label: "ADMIN" },
                                            { value: "user" as any, label: "USER" },
                                        ]}
                                        disabled={currentUser?.username !== "admin" && currentUser?.username !== "root"}
                                    />
                                </div>

                                <div style={{ gridColumn: "span 12", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                                    <button type="button" style={buttonStyle()} onClick={() => setUserFormOpen(false)}>Cancel</button>
                                    <button type="submit" style={buttonStyle("primary")}>Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Profile Modal */}
                {profileFormOpen && currentUser && (
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
                        onMouseDown={() => setProfileFormOpen(false)}
                    >
                        <div
                            style={{
                                background: "var(--card-bg)",
                                borderRadius: 14,
                                width: "min(500px, 100%)",
                                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div style={{ padding: 16, borderBottom: "1px solid var(--card-divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 18 }}>
                                    EDIT PROFILE
                                </div>
                                <IconCloseButton onClick={() => setProfileFormOpen(false)} />
                            </div>

                            <form
                                onSubmit={submitProfileForm}
                                style={{
                                    padding: 16,
                                    display: "grid",
                                    gridTemplateColumns: "repeat(12, 1fr)",
                                    gap: 14,
                                    alignItems: "start",
                                }}
                            >
                                <div style={{ gridColumn: "span 12" }}>
                                    <Label>Username</Label>
                                    <input
                                        style={inputStyle()}
                                        value={profileForm.username}
                                        onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                                        disabled={true}
                                    />
                                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800, marginTop: 4 }}>
                                        Username cannot be changed
                                    </div>
                                </div>

                                <div style={{ gridColumn: "span 12", marginTop: 8 }}>
                                    <div style={{ fontWeight: 900, color: "var(--text-1)", fontSize: 14, marginBottom: 8 }}>
                                        Change Password
                                    </div>
                                </div>

                                {/* NEW PASSWORD */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Label>
                                        New Password
                                        {passwordErrors.new && (
                                            <span style={{ color: "var(--danger)", fontSize: "11px", marginLeft: "8px" }}>
                                                {passwordErrors.new}
                                            </span>
                                        )}
                                    </Label>
                                    <input
                                        style={{
                                            ...inputStyle(),
                                            borderColor: passwordErrors.new ? "var(--danger)" : "var(--input-border)"
                                        }}
                                        type="password"
                                        value={profileForm.newPassword}
                                        onChange={(e) => {
                                            setProfileForm(p => ({ ...p, newPassword: e.target.value }));
                                            if (passwordErrors.new) {
                                                setPasswordErrors(prev => ({ ...prev, new: '' }));
                                            }
                                        }}
                                        placeholder="Enter new password"
                                    />
                                </div>

                                {/* CONFIRM NEW PASSWORD */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Label>
                                        Confirm New Password
                                        {passwordErrors.confirm && (
                                            <span style={{ color: "var(--danger)", fontSize: "11px", marginLeft: "8px" }}>
                                                {passwordErrors.confirm}
                                            </span>
                                        )}
                                    </Label>
                                    <input
                                        style={{
                                            ...inputStyle(),
                                            borderColor: passwordErrors.confirm ? "var(--danger)" : "var(--input-border)"
                                        }}
                                        type="password"
                                        value={profileForm.confirmPassword}
                                        onChange={(e) => {
                                            setProfileForm(p => ({ ...p, confirmPassword: e.target.value }));
                                            if (passwordErrors.confirm) {
                                                setPasswordErrors(prev => ({ ...prev, confirm: '' }));
                                            }
                                        }}
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                {/* CURRENT ROLE */}
                                <div style={{ gridColumn: "span 6" }}>
                                    <Label>Current Role</Label>
                                    <div style={{ ...inputStyle(), background: "var(--hover-1)", cursor: "default" }}>
                                        {currentUser?.role?.toUpperCase() || "USER"}
                                    </div>
                                </div>

                                <div style={{ gridColumn: "span 12", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                                    <button type="button" style={buttonStyle()} onClick={() => setProfileFormOpen(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" style={buttonStyle("primary")}>
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}