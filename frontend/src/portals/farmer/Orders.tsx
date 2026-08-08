import { useState } from "react";
import { CheckCircle2, ClipboardList, PackageCheck, XCircle } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import type { Order, Paginated } from "../../types";

/**
 * Farmer's side of the same Order model buyer/Orders.tsx shows — the
 * backend already scopes GET /marketplace/orders/ to orders placed against
 * this farmer's own listings, so no farmer-specific query param is needed.
 * Unlike the buyer, who pays and can cancel, a farmer accepts/declines a
 * pending order and marks it delivered once fulfilled — no payment action
 * here, that's the buyer's step.
 */
export default function FarmerOrders() {
  const { user } = useAuth();
  const { data: orders, refetch } = useFetch<Paginated<Order>>(user ? "/marketplace/orders/" : null, [user?.id]);
  const toast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<number | null>(null);

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
              <div key={o.id} className={`px-5 py-3 text-sm ${busyId === o.id ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-gray-900">
                    Order #{o.id} — {o.listing_crop} · GHS {o.agreed_price_ghs} · {o.buyer_name}
                  </span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    {o.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatus(o, "accepted", `Order #${o.id} accepted`)}
                          disabled={busyId === o.id}
                        >
                          <CheckCircle2 size={14} />
                          Accept
                        </Button>
                        <button
                          onClick={() => handleDecline(o)}
                          disabled={busyId === o.id}
                          className="text-gray-400 hover:text-status-danger transition-colors"
                          title="Decline order"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {(o.status === "accepted" || o.status === "paid") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(o, "delivered", `Order #${o.id} marked delivered`)}
                        disabled={busyId === o.id}
                      >
                        <PackageCheck size={14} />
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-1 capitalize">
                  {o.delivery_method}
                  {o.delivery_method === "delivery" && o.delivery_address ? ` · ${o.delivery_address}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            description="When a buyer orders one of your listings, it'll show up here."
          />
        )}
      </section>
    </div>
  );
}
