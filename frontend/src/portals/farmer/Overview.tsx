import { Link } from "react-router-dom";
import { CloudSun, Tractor, Sprout } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import type { Paginated, EquipmentBooking, ProduceListing, PlantingRecommendation } from "../../types";

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: number | string;
  to: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 hover:border-gray-200 transition-colors"
    >
      <div className="rounded-lg p-2.5" style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: accent }}>
          {value}
        </p>
      </div>
    </Link>
  );
}

export default function FarmerOverview() {
  const { user } = useAuth();
  const { data: bookings } = useFetch<Paginated<EquipmentBooking>>(user ? "/equipment/bookings/" : null, [user?.id]);
  const { data: listings } = useFetch<Paginated<ProduceListing>>(
    user ? `/marketplace/listings/?farmer=${user.id}` : null,
    [user?.id]
  );
  const { data: recommendations } = useFetch<Paginated<PlantingRecommendation>>(
    user ? "/weather/recommendations/" : null,
    [user?.id]
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening on your farm</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={CloudSun} label="Weather Guidance" value={recommendations?.count ?? 0} to="/farmer/weather" accent="#3B82F6" />
        <StatCard icon={Tractor} label="Equipment Requests" value={bookings?.count ?? 0} to="/farmer/equipment" accent="#D9A441" />
        <StatCard icon={Sprout} label="Produce Listings" value={listings?.count ?? 0} to="/farmer/marketplace" accent="#2F6B3C" />
      </div>

      {recommendations && recommendations.results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest Weather Guidance</h2>
            <Link to="/farmer/weather" className="text-sm text-brand-green hover:underline">
              View all
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{recommendations.results[0].crop}</span> —{" "}
            {recommendations.results[0].ai_rationale}
          </p>
        </div>
      )}
    </div>
  );
}
