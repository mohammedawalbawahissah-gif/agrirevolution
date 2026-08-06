import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, Order } from "../../types";

const STATUSES: Order["status"][] = ["pending", "accepted", "paid", "delivered", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-blue-50 text-blue-700",
  paid: "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-brand-green",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminOrders() {
  const { data: orders, isLoading, refetch } = useFetch<Paginated<Order>>("/marketplace/orders/");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function updateStatus(order: Order, status: Order["status"]) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">All produce orders across every buyer</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
            {orders?.results.map((o) => (
              <tr key={o.id} className={busyId === o.id ? "opacity-50" : ""}>
                <td className="px-5 py-3 font-medium">#{o.id}</td>
                <td className="px-5 py-3 text-gray-600">Listing #{o.listing}</td>
                <td className="px-5 py-3 text-gray-600">Buyer #{o.buyer}</td>
                <td className="px-5 py-3 text-gray-600">GHS {o.agreed_price_ghs}</td>
                <td className="px-5 py-3">
                  <select
                    value={o.status}
                    disabled={busyId === o.id}
                    onChange={(e) => updateStatus(o, e.target.value as Order["status"])}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 capitalize ${STATUS_STYLES[o.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && orders?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No orders yet.</p>
        )}
        {isLoading && <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}
