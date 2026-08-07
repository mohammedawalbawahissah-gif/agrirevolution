import { Link } from "react-router-dom";
import { Sprout, ShoppingCart, Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import type { Paginated, ProduceListing, Order } from "../../types";

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

export default function BuyerOverview() {
  const { user } = useAuth();
  const { data: listings } = useFetch<Paginated<ProduceListing>>("/marketplace/listings/?status=listed");
  const { data: orders } = useFetch<Paginated<Order>>(user ? "/marketplace/orders/" : null, [user?.id]);

  const pendingCount = orders?.results.filter((o) => o.status === "pending" || o.status === "accepted").length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's available and what you've ordered</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Sprout} label="Produce Available" value={listings?.count ?? 0} to="/buyer/marketplace" accent="#2F6B3C" />
        <StatCard icon={ShoppingCart} label="My Orders" value={orders?.count ?? 0} to="/buyer/orders" accent="#8B5CF6" />
        <StatCard icon={Clock} label="Pending / In Progress" value={pendingCount} to="/buyer/orders" accent="#F59E0B" />
      </div>
    </div>
  );
}
