import { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import type { Paginated, Order } from "../../types";

const STATUSES: Order["status"][] = ["pending", "accepted", "paid", "delivered", "cancelled"];

export default function AdminOrders() {
  const { data: orders, isLoading, refetch } = useFetch<Paginated<Order>>("/marketplace/orders/");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    if (!orders?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return orders.results;
    return orders.results.filter(
      (o) =>
        (o.listing_crop ?? "").toLowerCase().includes(q) ||
        (o.buyer_name ?? "").toLowerCase().includes(q) ||
        (o.farmer_name ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const toast = useToast();

  const openOrder = orders?.results.find((o) => o.id === openOrderId) ?? null;

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

  // Admin can move an order to any status — one button per status other
  // than the one it's already in.
  function actionsFor(order: Order): DetailAction[] {
    return STATUSES.filter((s) => s !== order.status).map((s) => ({
      label: `Mark ${s}`,
      variant: s === "cancelled" ? "danger" : "secondary",
      onClick: () => updateStatus(order, s),
    }));
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Orders</h1>
        <p className="text-page-subtitle">All produce orders across every buyer</p>
      </div>

      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders…" className="max-w-xs" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredOrders.length ? (
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
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpenOrderId(o.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${busyId === o.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">#{o.id}</td>
                    <td className="px-5 py-3 text-gray-600">{o.listing_crop}</td>
                    <td className="px-5 py-3 text-gray-600">{o.buyer_name}</td>
                    <td className="px-5 py-3 text-gray-600">GHS {o.agreed_price_ghs}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !isLoading ? (
          <EmptyState
            icon={ClipboardList}
            title={search ? "No orders match your search" : "No orders yet"}
            description={search ? undefined : "Buyer orders will appear here."}
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>

      <DetailModal
        isOpen={openOrder !== null}
        onClose={() => setOpenOrderId(null)}
        title={`Order #${openOrder?.id ?? ""}`}
        status={openOrder?.status}
        isBusy={busyId === openOrder?.id}
        fields={
          openOrder
            ? [
                { label: "Produce", value: openOrder.listing_crop },
                { label: "Buyer", value: openOrder.buyer_name },
                { label: "Farmer", value: openOrder.farmer_name },
                { label: "Price", value: `GHS ${openOrder.agreed_price_ghs}` },
                { label: "Delivery", value: openOrder.delivery_method === "delivery" ? "Delivery" : "Pickup" },
                ...(openOrder.delivery_address ? [{ label: "Address", value: openOrder.delivery_address }] : []),
                { label: "Payment method", value: openOrder.payment_method || "—" },
              ]
            : []
        }
        actions={openOrder ? actionsFor(openOrder) : []}
      />
    </div>
  );
}
