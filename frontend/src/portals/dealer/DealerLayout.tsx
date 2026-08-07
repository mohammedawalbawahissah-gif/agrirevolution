import { LayoutDashboard, Tractor, CalendarCheck, User as UserIcon } from "lucide-react";
import PortalShell from "../../components/PortalShell";

const NAV_ITEMS = [
  { to: "/dealer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dealer/equipment", label: "Equipment", icon: Tractor },
  { to: "/dealer/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/dealer/account", label: "Account", icon: UserIcon },
];

export default function DealerLayout() {
  return <PortalShell navItems={NAV_ITEMS} roleLabel="Dealer" />;
}
