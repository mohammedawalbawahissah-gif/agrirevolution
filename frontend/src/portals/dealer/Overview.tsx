import { Link } from "react-router-dom";
import { Tractor, CalendarCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import type { Paginated, Equipment, EquipmentBooking } from "../../types";

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

export default function DealerOverview() {
  const { user } = useAuth();
  const { data: equipment } = useFetch<Paginated<Equipment>>(
    user ? `/equipment/equipment/?dealer=${user.id}` : null,
    [user?.id]
  );
  const { data: bookings } = useFetch<Paginated<EquipmentBooking>>(user ? "/equipment/bookings/" : null, [user?.id]);

  const pendingCount = bookings?.results.filter((b) => b.status === "requested").length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's how your equipment business is doing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Tractor} label="Equipment Listed" value={equipment?.count ?? 0} to="/dealer/equipment" accent="#D9A441" />
        <StatCard icon={CalendarCheck} label="Total Bookings" value={bookings?.count ?? 0} to="/dealer/bookings" accent="#3B82F6" />
        <StatCard icon={CheckCircle2} label="Pending Requests" value={pendingCount} to="/dealer/bookings" accent="#F59E0B" />
      </div>
    </div>
  );
}
