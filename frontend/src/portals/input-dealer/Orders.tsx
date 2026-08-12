import { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import DetailModal, { type DetailAction, type DetailField } from "../../components/ui/DetailModal";
import type { Paginated, InputOrder } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

export default function InputDealerOrders() {
  const { user } = useAuth();
  const { data: orders, isLoading, refetch } = useFetch<Paginated<InputOrder>>(
    user ? "/inputs/orders/" : null,
    [user?.id]
  );
  const toast = useToast();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<InputOrder | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!orders?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return orders.results;
    return orders.results.filter(
      (o) =>
        (o.product_name ?? "").toLowerCase().includes(q) ||
        (o.farmer_name ?? "").toLowerCase().includes(q) ||
        String(o.id).includes(q)
    );
  }, [orders, search]);

  async function updateStatus(order: InputOrder, status: InputOrder["status"]) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/inputs/orders/${order.id}/`, { status });
      toast.success(`Order #${order.id} marked ${status}`);
      setSelected(null);
      refetch();
    } catch {
      toast.error("Couldn't update this order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(order: InputOrder) {
    const ok = await confirm({
      title: "Cancel this order?",
      description: `This cancels ${order.farmer_name ?? "the farmer"}'s order and returns the stock. This can't be undone.`,
      confirmLabel: "Cancel order",
      tone: "danger",
    });
    if (ok) updateStatus(order, "cancelled");
  }

  function fieldsFor(o: InputOrder): DetailField[] {
    return [
      { label: "Product", value: o.product_name ?? `#${o.product}` },
      { label: "Farmer", value: o.farmer_name ?? `#${o.farmer}` },
      { label: "Quantity", value: String(o.quantity) },
      { label: "Total", value: o.total_price_ghs ? `GHS ${o.total_price_ghs}` : "—" },
      { label: "Delivery", value: o.delivery_method === "delivery" ? "Deliver to farmer" : "Farmer pickup" },
      ...(o.delivery_method === "delivery" && o.delivery_location ? [{ label: "Location", value: o.delivery_location }] : []),
      { label: "Payment", value: o.payment_channel ? PAYMENT_CHANNEL_LABELS[o.payment_channel] : "Not specified" },
    ];
  }

  function actionsFor(o: InputOrder): DetailAction[] {
    switch (o.status) {
      case "pending":
        return [
          { label: "Confirm", variant: "primary", onClick: () => updateStatus(o, "confirmed") },
          { label: "Decline", variant: "danger", onClick: () => handleCancel(o) },
        ];
      case "confirmed":
        return [
          { label: "Mark Fulfilled", variant: "primary", onClick: () => updateStatus(o, "fulfilled") },
          { label: "Cancel", variant: "danger", onClick: () => handleCancel(o) },
        ];
      default:
        return [];
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-page-title">Orders</h1>
          <p className="text-page-subtitle">Requests farmers have placed against your products</p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders…" className="w-56" />
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filtered.length ? (
          <div className="divide-y divide-gray-100">
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full text-left px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">
                  {o.product_name ?? `Order #${o.id}`} — {o.farmer_name ?? `Farmer #${o.farmer}`} · {o.quantity}x
                  {o.total_price_ghs && <span className="text-gray-400"> · GHS {o.total_price_ghs}</span>}
                </span>
                <StatusBadge status={o.status} />
              </button>
            ))}
          </div>
        ) : (
          !isLoading && (
            <EmptyState
              icon={ClipboardList}
              title={search ? "No orders match your search" : "No orders yet"}
              description={search ? undefined : "Orders farmers place will show up here."}
            />
          )
        )}
      </section>

      {selected && (
        <DetailModal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={selected.product_name ?? `Order #${selected.id}`}
          status={selected.status}
          isBusy={busyId === selected.id}
          fields={fieldsFor(selected)}
          actions={actionsFor(selected)}
        />
      )}
    </div>
  );
}
