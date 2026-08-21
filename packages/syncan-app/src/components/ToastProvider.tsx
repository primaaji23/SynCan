import React, { createContext, useContext, useMemo, useState } from "react";

export type ToastTone = "success" | "error" | "info" | "warning";

const TOAST_TTL_MS = 3500;
const TOAST_IN_MS = 220;
const TOAST_OUT_MS = 180;

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  leaving?: boolean;
};

type ToastApi = {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() must be used inside <ToastProvider />");
  return ctx;
}

function toneStyle(tone: ToastTone): { bg: string; bd: string; fg: string } {
  switch (tone) {
    case "success":
      return { bg: "#ECFDF5", bd: "#A7F3D0", fg: "#047857" };
    case "error":
      return { bg: "#FEF2F2", bd: "#FECACA", fg: "#B91C1C" };
    case "warning":
      return { bg: "#FFFBEB", bd: "#FDE68A", fg: "#B45309" };
    default:
      return { bg: "#EFF6FF", bd: "#BFDBFE", fg: "#1D4ED8" };
  }
}

function hexToRgba(hex: string, alpha: number) {
  // supports #RGB / #RRGGBB
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(15,23,42,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function IconCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Dismiss"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        color: "#0F172A",
        fontWeight: 900,
        fontSize: 18,
        width: 32,
        height: 32,
        borderRadius: 999,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(15,23,42,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      ×
    </button>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function startDismiss(id: number) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_OUT_MS);
  }

  function dismiss(id: number) {
    startDismiss(id);
  }

  const api = useMemo<ToastApi>(() => {
    function show(message: string, tone: ToastTone = "info") {
      const id = Date.now() + Math.floor(Math.random() * 100000);
      setToasts((prev) => [...prev, { id, message, tone, leaving: false }]);
      window.setTimeout(() => startDismiss(id), TOAST_TTL_MS);
    }

    return {
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
      warning: (m) => show(m, "warning"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <style>
          {`
            @keyframes toastIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.985); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes toastOut {
              from { opacity: 1; transform: translateY(0) scale(1); }
              to   { opacity: 0; transform: translateY(-8px) scale(0.985); }
            }
            @keyframes toastProg {
              from { transform: scaleX(1); }
              to   { transform: scaleX(0); }
            }
            @media (prefers-reduced-motion: reduce) {
              .toast-anim { animation: none !important; }
              .toast-prog { animation: none !important; transform: scaleX(1) !important; }
            }
          `}
        </style>

        {toasts.map((t) => {
          const s = toneStyle(t.tone);

          // progress colors follow tone (using fg color)
          const progTrack = hexToRgba(s.fg, 0.14);
          const progFill = hexToRgba(s.fg, 0.55);

          return (
            <div
              key={t.id}
              className="toast-anim"
              style={{
                pointerEvents: "auto",
                minWidth: 280,
                maxWidth: 460,
                background: s.bg,
                border: `1px solid ${s.bd}`,
                color: s.fg,
                padding: "12px 14px",
                borderRadius: 12,
                fontWeight: 900,
                boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
                display: "flex",
                gap: 12,
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
                animation: t.leaving
                  ? `toastOut ${TOAST_OUT_MS}ms ease-in forwards`
                  : `toastIn ${TOAST_IN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  lineHeight: "20px",
                  overflowWrap: "anywhere",
                  paddingTop: 1,
                }}
              >
                {t.message}
              </div>

              <div style={{ alignSelf: "center" }}>
                <IconCloseButton onClick={() => dismiss(t.id)} />
              </div>

              {/* progress bar (tone-colored) */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 3,
                  background: progTrack,
                }}
              >
                <div
                  className="toast-prog"
                  style={{
                    height: "100%",
                    width: "100%",
                    transformOrigin: "left",
                    background: progFill,
                    animation: t.leaving ? "none" : `toastProg ${TOAST_TTL_MS}ms linear forwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
