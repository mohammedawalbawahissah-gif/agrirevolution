import { useState } from "react";
import { CloudSun, Tractor, Sprout, User as UserIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import WeatherTab from "./WeatherTab";
import EquipmentTab from "./EquipmentTab";
import MarketplaceTab from "./MarketplaceTab";
import AccountTab from "./AccountTab";

type Tab = "weather" | "equipment" | "marketplace" | "account";

const TABS: { id: Tab; label: string; icon: typeof CloudSun }[] = [
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "equipment", label: "Equipment", icon: Tractor },
  { id: "marketplace", label: "Marketplace", icon: Sprout },
  { id: "account", label: "Account", icon: UserIcon },
];

// Mirrors the mobile app's four-tab structure exactly, just expressed as
// top tabs instead of a bottom bar, since that's the web-native pattern.
export default function FarmerDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("weather");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">AgriRevolution</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.first_name || user?.username}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
          Sign out
        </button>
      </header>

      <nav className="bg-white border-b px-6 flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-brand-green text-brand-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === "weather" && <WeatherTab />}
        {activeTab === "equipment" && <EquipmentTab />}
        {activeTab === "marketplace" && <MarketplaceTab />}
        {activeTab === "account" && <AccountTab />}
      </main>
    </div>
  );
}
