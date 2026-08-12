import { LayoutDashboard, Package, ClipboardList, User as UserIcon } from "lucide-react";
import PortalShell from "../../components/PortalShell";

const NAV_ITEMS = [
  { to: "/input-dealer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/input-dealer/products", label: "Products", icon: Package },
  { to: "/input-dealer/orders", label: "Orders", icon: ClipboardList },
  { to: "/input-dealer/account", label: "Account", icon: UserIcon },
];

export default function InputDealerLayout() {
  return <PortalShell navItems={NAV_ITEMS} roleLabel="Input Dealer" />;
}
