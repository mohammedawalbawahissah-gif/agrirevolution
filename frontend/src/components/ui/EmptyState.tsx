import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Consistent "nothing here yet" treatment for empty tables/lists across
 * every portal — an icon, a plain-language title, and an optional next
 * step, instead of a lone gray sentence in the middle of a table.
 */
export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center mb-3">
        <Icon size={18} className="text-brand-green" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
