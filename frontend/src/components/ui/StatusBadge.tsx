type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
  info: "bg-status-info-bg text-status-info",
  neutral: "bg-status-neutral-bg text-status-neutral",
};

// Every status value used anywhere in the app (users, bookings, orders,
// listings, transactions) maps to one of five tones, so "confirmed" and
// "delivered" always read as the same kind of good news, and "cancelled"
// and "failed" always read as the same kind of bad news.
const STATUS_TONE: Record<string, Tone> = {
  // generic
  active: "success",
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
  unverified: "neutral",

  listed: "info",
};

interface StatusBadgeProps {
  status: string;
  tone?: Tone;
}

/**
 * Renders any status string (booking status, order status, listing status,
 * verification state...) as a consistent pill with a tone dot. Pass `tone`
 * to override the automatic mapping for a status this component doesn't
 * recognize yet.
 */
export default function StatusBadge({ status, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? STATUS_TONE[status] ?? "neutral";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium capitalize ${TONE_CLASSES[resolvedTone]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
