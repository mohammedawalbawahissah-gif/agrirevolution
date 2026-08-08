import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import type { Paginated, Order } from "../../types";

const STATUSES: Order["status"][] = ["pending", "accepted", "paid", "delivered", "cancelled"];

export default function AdminOrders() {
  const { data: orders, isLoading, refetch } = useFetch<Paginated<Order>>("/marketplace/orders/");
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();

  async function updateStatus(order: Order, status: Order["status"]) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status });
      toast.success(`Order #${order.id} marked ${status}`);
      refetch();
    } catch {
      toast.error("Couldn't update this order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Orders</h1>
        <p className="text-page-subtitle">All produce orders across every buyer</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {orders?.results.length ? (
          <div className="overflow-x-auto">
<table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Order</th>
                <th className="text-left px-5 py-3 font-medium">Listing</th>
                <th className="text-left px-5 py-3 font-medium">Buyer</th>
                <th className="text-left px-5 py-3 font-medium">Price</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.results.map((o) => (
                <tr key={o.id} className={busyId === o.id ? "opacity-50" : ""}>
                  <td className="px-5 py-3 font-medium text-gray-900">#{o.id}</td>
                  <td className="px-5 py-3 text-gray-600">Listing #{o.listing}</td>
                  <td className="px-5 py-3 text-gray-600">Buyer #{o.buyer}</td>
                  <td className="px-5 py-3 text-gray-600">GHS {o.agreed_price_ghs}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <select
                        value={o.status}
                        disabled={busyId === o.id}
                        onChange={(e) => updateStatus(o, e.target.value as Order["status"])}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 capitalize focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        ) : !isLoading ? (
          <EmptyState icon={ClipboardList} title="No orders yet" description="Buyer orders will appear here." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
