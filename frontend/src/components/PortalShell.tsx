import { NavLink, Outlet } from "react-router-dom";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="px-5 py-5 border-b">
          <h1 className="text-lg font-bold text-brand-green">AgriRevolution</h1>
          <p className="text-xs text-gray-500 mt-0.5">{roleLabel}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-green/10 text-brand-green" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium">{user?.first_name || user?.username}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 w-full"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
