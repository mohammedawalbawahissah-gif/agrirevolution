import type { ReactNode } from "react";
import { X } from "lucide-react";
import Button from "./Button";
import StatusBadge from "./StatusBadge";

export interface DetailField {
  label: string;
  value: string;
}

export interface DetailAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  status?: string;
  fields: DetailField[];
  actions?: DetailAction[];
  isBusy?: boolean;
  /** Extra content between the fields list and the actions row — e.g. an editable notes field. */
  children?: ReactNode;
}

/**
 * Click-a-row-to-open detail view, replacing the inline status dropdown
 * pattern on list pages: dealer Bookings, admin Equipment/Bookings/Orders,
 * admin Crop Health. A row's full detail (all the fields the list row can't
 * fit) plus its available actions live here instead, so the list itself
 * stays a compact scan and the actions get proper labels instead of a bare
 * <select>. `children` is an escape hatch for pages that need more than
 * static fields + buttons (e.g. an editable admin-notes textarea).
 */
export default function DetailModal({ isOpen, onClose, title, status, fields, actions, isBusy, children }: DetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto ${isBusy ? "opacity-60 pointer-events-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {status && <StatusBadge status={status} />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2.5">
          {fields.map((f) => (
            <div key={f.label} className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500 shrink-0">{f.label}</span>
              <span className="text-gray-900 text-right">{f.value}</span>
            </div>
          ))}
        </div>

        {children}

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-gray-100">
            {actions.map((a) => (
              <Button key={a.label} variant={a.variant ?? "secondary"} size="sm" onClick={a.onClick} disabled={a.disabled || isBusy}>
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
