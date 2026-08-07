import { useState } from "react";
import { XCircle, ClipboardList } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import type { Paginated, Order } from "../../types";

export default function BuyerOrders() {
  const { user } = useAuth();
  // Backend already scopes /marketplace/orders/ to this buyer's own orders.
  const { data: myOrders, refetch } = useFetch<Paginated<Order>>(user ? "/marketplace/orders/" : null, [user?.id]);
  const toast = useToast();
  const confirm = useConfirm();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});

  async function handleCancelOrder(order: Order) {
    const ok = await confirm({
      title: `Cancel order #${order.id}?`,
      description: "The seller will be notified and this can't be undone.",
      confirmLabel: "Cancel order",
      tone: "danger",
    });
    if (!ok) return;

    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status: "cancelled" });
      toast.success(`Order #${order.id} cancelled`);
      refetch();
    } catch {
      toast.error("Couldn't cancel this order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(order: Order) {
    setBusyId(order.id);
    setPaymentMessage((m) => ({ ...m, [order.id]: "" }));
    try {
      const { data: txn } = await apiClient.post("/payments/transactions/", {
        purpose: "produce_sale",
        channel: order.payment_method || "mtn_momo",
        amount_ghs: order.agreed_price_ghs,
        produce_order: order.id,
      });
      const { data } = await apiClient.post(`/payments/transactions/${txn.id}/initiate/`);
      setPaymentMessage((m) => ({ ...m, [order.id]: data.detail }));
      toast.info(data.detail || "Payment started — check your phone to complete it.");
    } catch {
      setPaymentMessage((m) => ({ ...m, [order.id]: "Payment could not be started. Try again." }));
      toast.error("Payment could not be started.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-page-title">My Orders</h1>
        <p className="text-page-subtitle">Track and pay for produce you've ordered</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        {myOrders?.results.length ? (
          <div className="divide-y divide-gray-100">
            {myOrders.results.map((o) => (
              <div key={o.id} className={`px-5 py-3 text-sm ${busyId === o.id ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">
                    Order #{o.id} — GHS {o.agreed_price_ghs}
                  </span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    {o.status === "accepted" && (
                      <Button variant="ghost" size="sm" onClick={() => handlePay(o)} disabled={busyId === o.id}>
                        Pay via MoMo
                      </Button>
                    )}
                    {(o.status === "pending" || o.status === "accepted") && (
                      <button
                        onClick={() => handleCancelOrder(o)}
                        disabled={busyId === o.id}
                        className="text-gray-400 hover:text-status-danger transition-colors"
                        title="Cancel order"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-1 capitalize">
                  {o.delivery_method}
                  {o.delivery_method === "delivery" && o.delivery_address ? ` · ${o.delivery_address}` : ""}
                </p>
                {paymentMessage[o.id] && <p className="text-xs text-gray-500 mt-1">{paymentMessage[o.id]}</p>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No orders placed yet"
            description="Produce you order from the marketplace will show up here."
          />
        )}
      </section>
    </div>
  );
}
