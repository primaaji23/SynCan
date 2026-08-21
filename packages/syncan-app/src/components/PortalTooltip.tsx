import { createPortal } from "react-dom";

type PortalTooltipProps = {
    show: boolean;
    rect: DOMRect | null;
    label: string;
};

export default function PortalTooltip({
    show,
    rect,
    label,
}: PortalTooltipProps) {
    if (!show || !rect) return null;

    const root =
        document.getElementById("syncan-portal-root") || document.body;

    const theme =
        document.documentElement.getAttribute("data-syncan-theme");

    const isMidnight = theme === "midnight";

    /* COLORS */
    const bg = isMidnight ? "#2B2F55" : "#F8FAFC";
    const text = isMidnight ? "#F8FAFC" : "#2B2F55";
    const border = isMidnight
        ? "rgba(255,255,255,0.10)"
        : "var(--surface-border)";

    return createPortal(
        <div
            style={{
                position: "fixed",
                top: rect.top + rect.height / 2,
                left: rect.right + 23,
                transform: "translateY(-50%)",
                zIndex: 999999,
                pointerEvents: "none",
            }}
        >
            {/* Arrow */}
            <div
                style={{
                    position: "absolute",
                    left: -7,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 0,
                    height: 0,
                    borderTop: "7px solid transparent",
                    borderBottom: "7px solid transparent",
                    borderRight: `7px solid ${bg}`,
                }}
            />

            {/* Tooltip body */}
            <div
                style={{
                    background: bg,
                    color: text,
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,

                    /* SUBTLE SHADOW */
                    boxShadow: isMidnight
                        ? "0 6px 16px rgba(0,0,0,0.45)"
                        : "0 6px 14px rgba(0,0,0,0.18)",
                }}
            >
                {label}
            </div>
        </div>,
        root
    );
}
