import { LayoutDashboard, Users, Tractor, CalendarCheck, Sprout, ShoppingCart, Receipt, User as UserIcon } from "lucide-react";
import PortalShell from "../../components/PortalShell";

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/equipment", label: "Equipment", icon: Tractor },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/listings", label: "Listings", icon: Sprout },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/account", label: "Account", icon: UserIcon },
];

export default function AdminLayout() {
  return <PortalShell navItems={NAV_ITEMS} roleLabel="Admin" />;
}
