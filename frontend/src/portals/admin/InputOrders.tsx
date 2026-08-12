import { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import type { Paginated, InputOrder } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

const STATUSES: InputOrder["status"][] = ["pending", "confirmed", "fulfilled", "cancelled"];
const STATUS_LABELS: Record<InputOrder["status"], string> = {
  pending: "Mark Pending",
  confirmed: "Mark Confirmed",
  fulfilled: "Mark Fulfilled",
  cancelled: "Cancel Order",
};

export default function AdminInputOrders() {
  const { data: orders, isLoading, refetch } = useFetch<Paginated<InputOrder>>("/inputs/orders/");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const filtered = useMemo(() => {
    if (!orders?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return orders.results;
    return orders.results.filter(
      (o) =>
        (o.product_name ?? "").toLowerCase().includes(q) ||
        (o.farmer_name ?? "").toLowerCase().includes(q) ||
        (o.dealer_name ?? "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const openItem = orders?.results.find((o) => o.id === openItemId) ?? null;

  async function updateStatus(order: InputOrder, status: InputOrder["status"]) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/inputs/orders/${order.id}/`, { status });
      toast.success(`Order #${order.id} marked ${status}`);
      setOpenItemId(null);
      refetch();
    } catch {
      toast.error("Couldn't update this order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-page-title">Input Orders</h1>
          <p className="text-page-subtitle">All farm input orders across every farmer and dealer</p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders…" className="w-64" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Order</th>
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-left px-5 py-3 font-medium">Farmer</th>
                  <th className="text-left px-5 py-3 font-medium">Total</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpenItemId(o.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${busyId === o.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">#{o.id}</td>
                    <td className="px-5 py-3 text-gray-600">{o.product_name ?? `#${o.product}`}</td>
                    <td className="px-5 py-3 text-gray-600">{o.farmer_name ?? `#${o.farmer}`}</td>
                    <td className="px-5 py-3 text-gray-600">{o.total_price_ghs ? `GHS ${o.total_price_ghs}` : "—"}</td>
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
            title={search ? "No orders match your search" : "No input orders yet"}
            description={search ? undefined : "Farmer orders on input products will appear here."}
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>

      {openItem && (
        <DetailModal
          isOpen={!!openItem}
          onClose={() => setOpenItemId(null)}
          title={`Order #${openItem.id}`}
          status={openItem.status}
          isBusy={busyId === openItem.id}
          fields={[
            { label: "Product", value: openItem.product_name ?? `#${openItem.product}` },
            { label: "Dealer", value: openItem.dealer_name ?? "—" },
            { label: "Farmer", value: openItem.farmer_name ?? `#${openItem.farmer}` },
            { label: "Quantity", value: String(openItem.quantity) },
            { label: "Total", value: openItem.total_price_ghs ? `GHS ${openItem.total_price_ghs}` : "—" },
            { label: "Delivery", value: openItem.delivery_method === "delivery" ? "Delivery" : "Pickup" },
            {
              label: "Payment",
              value: openItem.payment_channel ? PAYMENT_CHANNEL_LABELS[openItem.payment_channel] : "Not specified",
            },
          ]}
          actions={STATUSES.filter((s) => s !== openItem.status).map(
            (s): DetailAction => ({
              label: STATUS_LABELS[s],
              variant: s === "cancelled" ? "danger" : "secondary",
              onClick: () => updateStatus(openItem, s),
            })
          )}
        />
      )}
    </div>
  );
}
