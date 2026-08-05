import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, Tractor, CalendarCheck, Sprout, ShoppingCart, Wallet } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import type { AdminStats } from "../../types";

const ROLE_COLORS = ["#2F6B3C", "#D9A441", "#3B82F6", "#8B5CF6"];
const STATUS_COLORS: Record<string, string> = {
  requested: "#F59E0B",
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  accepted: "#3B82F6",
  in_progress: "#8B5CF6",
  paid: "#8B5CF6",
  completed: "#2F6B3C",
  delivered: "#2F6B3C",
  listed: "#2F6B3C",
  reserved: "#3B82F6",
  sold: "#2F6B3C",
  cancelled: "#DC2626",
  expired: "#6B7280",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className="rounded-lg p-2.5" style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={20} className="shrink-0" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: accent }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function statusData(byStatus: Record<string, number>) {
  return Object.entries(byStatus).map(([status, count]) => ({
    status: status.replace("_", " "),
    count,
    fill: STATUS_COLORS[status] || "#9CA3AF",
  }));
}

export default function Overview() {
  const { data: stats, isLoading } = useFetch<AdminStats>("/accounts/admin-stats/");

  if (isLoading || !stats) {
    return <div className="p-8 text-gray-400 text-sm">Loading dashboard…</div>;
  }

  const roleData = [
    { name: "Farmers", value: stats.users.farmer },
    { name: "Dealers", value: stats.users.dealer },
    { name: "Buyers", value: stats.users.buyer },
    { name: "Admins", value: stats.users.admin },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide activity at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users.total} accent="#2F6B3C" />
        <StatCard icon={Tractor} label="Equipment Listed" value={stats.equipment.total} accent="#D9A441" />
        <StatCard icon={CalendarCheck} label="Bookings" value={stats.bookings.total} accent="#3B82F6" />
        <StatCard icon={Sprout} label="Produce Listings" value={stats.listings.total} accent="#2F6B3C" />
        <StatCard icon={ShoppingCart} label="Orders" value={stats.orders.total} accent="#8B5CF6" />
        <StatCard
          icon={Wallet}
          label="Transaction Volume"
          value={`GHS ${stats.transactions.total_amount_ghs}`}
          accent="#D9A441"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Users by Role</h2>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">No users yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Equipment Bookings by Status</h2>
          {stats.bookings.total > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData(stats.bookings.by_status)}>
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">No bookings yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Produce Listings by Status</h2>
          {stats.listings.total > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData(stats.listings.by_status)}>
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">No listings yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Orders by Status</h2>
          {stats.orders.total > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData(stats.orders.by_status)}>
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
