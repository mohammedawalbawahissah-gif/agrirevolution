import { LayoutDashboard, Sparkles, Tractor, Sprout, User as UserIcon } from "lucide-react";
import PortalShell from "../../components/PortalShell";

const NAV_ITEMS = [
  { to: "/farmer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/farmer/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/farmer/equipment", label: "Equipment", icon: Tractor },
  { to: "/farmer/marketplace", label: "Marketplace", icon: Sprout },
  { to: "/farmer/account", label: "Account", icon: UserIcon },
];

export default function FarmerLayout() {
  return <PortalShell navItems={NAV_ITEMS} roleLabel="Farmer" />;
}
