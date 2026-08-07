import { LayoutDashboard, Sprout, ShoppingCart, User as UserIcon } from "lucide-react";
import PortalShell from "../../components/PortalShell";

const NAV_ITEMS = [
  { to: "/buyer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/buyer/marketplace", label: "Marketplace", icon: Sprout },
  { to: "/buyer/orders", label: "My Orders", icon: ShoppingCart },
  { to: "/buyer/account", label: "Account", icon: UserIcon },
];

export default function BuyerLayout() {
  return <PortalShell navItems={NAV_ITEMS} roleLabel="" />;
}
