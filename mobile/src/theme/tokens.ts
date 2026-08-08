/**
 * Shared design tokens — the mobile counterpart of the web frontend's
 * index.css @theme block. Every screen should pull colors from here
 * instead of hardcoding hex values, so the app reads as one product
 * across web and mobile.
 */
export const colors = {
  brandGreen: "#B3543A",
  brandGreenDark: "#8C4029",
  brandGreenLight: "#F5E6E1",
  brandGold: "#D9A441",
  brandGoldDark: "#B3822F",
  brandCream: "#FBF8F2",

  statusSuccess: "#334155",
  statusSuccessBg: "#E7EBF0",
  statusWarning: "#B3822F",
  statusWarningBg: "#FBF1DD",
  statusDanger: "#B3403A",
  statusDangerBg: "#FBEAE9",
  statusInfo: "#2A5F74",
  statusInfoBg: "#E5F1F4",
  statusNeutral: "#6B7280",
  statusNeutralBg: "#F3F4F6",

  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 16,
  full: 999,
};

// Every status value used anywhere in the app maps to one of five tones —
// kept in sync with the web frontend's StatusBadge mapping.
type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const statusTone: Record<string, Tone> = {
  active: "success",
  available: "success",
  verified: "success",
  completed: "success",
  confirmed: "success",
  accepted: "success",
  delivered: "success",
  sold: "success",
  paid: "success",
  success: "success",

  pending: "warning",
  requested: "warning",
  in_progress: "warning",
  reserved: "warning",

  cancelled: "danger",
  failed: "danger",
  expired: "danger",
  paused: "neutral",
  unverified: "neutral",

  listed: "info",
};

export function toneColors(tone: Tone) {
  switch (tone) {
    case "success":
      return { fg: colors.statusSuccess, bg: colors.statusSuccessBg };
    case "warning":
      return { fg: colors.statusWarning, bg: colors.statusWarningBg };
    case "danger":
      return { fg: colors.statusDanger, bg: colors.statusDangerBg };
    case "info":
      return { fg: colors.statusInfo, bg: colors.statusInfoBg };
    case "neutral":
    default:
      return { fg: colors.statusNeutral, bg: colors.statusNeutralBg };
  }
}
