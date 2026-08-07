import { NavLink, Outlet } from "react-router-dom";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface PortalShellProps {
  navItems: NavItem[];
  roleLabel: string;
}

/**
 * Shared sidebar shell used by every role's portal (admin/farmer/dealer/buyer).
 * Each role passes its own nav items and label; the structure — logo, nav,
 * user footer, sign out — stays identical so the app feels like one product
 * instead of four differently-built ones.
 */
export default function PortalShell({ navItems, roleLabel }: PortalShellProps) {
  const { user, logout } = useAuth();

  const initials = (user?.first_name?.[0] || user?.username?.[0] || "?").toUpperCase();

  return (
    <div className="min-h-screen bg-brand-cream flex">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-brand-green tracking-tight">AgriRevolution</h1>
          <p className="text-eyebrow mt-0.5">{roleLabel}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-green-light text-brand-green"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-green" />
                  )}
                  <Icon size={18} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-green-light text-brand-green text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name || user?.username}
              </p>
              <p className="text-xs text-gray-400 capitalize">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-end px-6 shrink-0">
          <NotificationBell />
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
