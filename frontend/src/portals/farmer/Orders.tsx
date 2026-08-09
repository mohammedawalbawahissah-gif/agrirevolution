import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import type { Order, Paginated } from "../../types";

/**
 * Farmer's side of the same Order model buyer/Orders.tsx shows — the
 * backend already scopes GET /marketplace/orders/ to orders placed against
 * this farmer's own listings, so no farmer-specific query param is needed.
 * Unlike the buyer, who pays and can cancel, a farmer accepts/declines a
 * pending order and marks it delivered once fulfilled — no payment action
 * here, that's the buyer's step.
 *
 * Click-a-row-to-open-DetailModal, same pattern as dealer Bookings and
 * admin Equipment/Bookings/Orders/Crop Health, instead of inline row buttons.
 */
export default function FarmerOrders() {
  const { user } = useAuth();
  const { data: orders, isLoading, refetch } = useFetch<Paginated<Order>>(
    user ? "/marketplace/orders/" : null,
    [user?.id]
  );
  const toast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);

  const openOrder = orders?.results.find((o) => o.id === openOrderId) ?? null;

  async function updateStatus(order: Order, status: Order["status"], successMessage: string) {
    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status });
      toast.success(successMessage);
      refetch();
    } catch {
      toast.error("Couldn't update this order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(order: Order) {
    const ok = await confirm({
      title: `Decline order #${order.id}?`,
      description: `${order.buyer_name} will be notified. This can't be undone.`,
      confirmLabel: "Decline order",
      tone: "danger",
    });
    if (!ok) return;
    updateStatus(order, "cancelled", `Order #${order.id} declined`);
  }

  function actionsFor(order: Order): DetailAction[] {
    if (order.status === "pending") {
      return [
        { label: "Accept", variant: "primary", onClick: () => updateStatus(order, "accepted", `Order #${order.id} accepted`) },
        { label: "Decline", variant: "danger", onClick: () => handleDecline(order) },
      ];
    }
    if (order.status === "accepted" || order.status === "paid") {
      return [
        {
          label: "Mark Delivered",
          variant: "primary",
          onClick: () => updateStatus(order, "delivered", `Order #${order.id} marked delivered`),
        },
      ];
    }
    return [];
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-page-title">Orders</h1>
        <p className="text-page-subtitle">Buyers who want to purchase your produce</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        {orders?.results.length ? (
          <div className="divide-y divide-gray-100">
            {orders.results.map((o) => (
              <button
                key={o.id}
                onClick={() => setOpenOrderId(o.id)}
                className={`w-full text-left px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors ${
                  busyId === o.id ? "opacity-50" : ""
                }`}
              >
                <span className="text-gray-900">
                  Order #{o.id} — {o.listing_crop} · GHS {o.agreed_price_ghs} · {o.buyer_name}
                </span>
                <StatusBadge status={o.status} />
              </button>
            ))}
          </div>
        ) : !isLoading ? (
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            description="When a buyer orders one of your listings, it'll show up here."
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </section>

      <DetailModal
        isOpen={openOrder !== null}
        onClose={() => setOpenOrderId(null)}
        title={`Order #${openOrder?.id ?? ""}`}
        status={openOrder?.status}
        isBusy={busyId === openOrder?.id}
        fields={
          openOrder
            ? [
                { label: "Produce", value: openOrder.listing_crop ?? "—" },
                { label: "Buyer", value: openOrder.buyer_name ?? "—" },
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
