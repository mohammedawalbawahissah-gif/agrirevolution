import { Link } from "react-router-dom";
import { Package, ClipboardList, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import type { Paginated, InputProduct, InputOrder } from "../../types";

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

export default function InputDealerOverview() {
  const { user } = useAuth();
  const { data: products } = useFetch<Paginated<InputProduct>>(user ? "/inputs/products/" : null, [user?.id]);
  const { data: orders } = useFetch<Paginated<InputOrder>>(user ? "/inputs/orders/" : null, [user?.id]);

  const myProducts = products?.results.filter((p) => p.dealer === user?.id) ?? [];
  const pendingCount = orders?.results.filter((o) => o.status === "pending").length ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || user?.username}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's how your input supply business is doing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Package} label="Products Listed" value={myProducts.length} to="/input-dealer/products" accent="#D9A441" />
        <StatCard icon={ClipboardList} label="Total Orders" value={orders?.count ?? 0} to="/input-dealer/orders" accent="#3B82F6" />
        <StatCard icon={CheckCircle2} label="Pending Orders" value={pendingCount} to="/input-dealer/orders" accent="#F59E0B" />
      </div>
    </div>
  );
}
