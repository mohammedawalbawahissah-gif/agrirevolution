import { useState } from "react";
import { XCircle } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import type { Paginated, Order } from "../../types";

export default function BuyerOrders() {
  const { user } = useAuth();
  // Backend already scopes /marketplace/orders/ to this buyer's own orders.
  const { data: myOrders, refetch } = useFetch<Paginated<Order>>(user ? "/marketplace/orders/" : null, [user?.id]);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});

  async function handleCancelOrder(order: Order) {
    if (!confirm("Cancel this order?")) return;
    setBusyId(order.id);
    try {
      await apiClient.patch(`/marketplace/orders/${order.id}/`, { status: "cancelled" });
      refetch();
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
        channel: "mtn_momo",
        amount_ghs: order.agreed_price_ghs,
        produce_order: order.id,
      });
      const { data } = await apiClient.post(`/payments/transactions/${txn.id}/initiate/`);
      setPaymentMessage((m) => ({ ...m, [order.id]: data.detail }));
    } catch {
      setPaymentMessage((m) => ({ ...m, [order.id]: "Payment could not be started. Try again." }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track and pay for produce you've ordered</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="divide-y">
          {myOrders?.results.map((o) => (
            <div key={o.id} className={`px-5 py-3 text-sm ${busyId === o.id ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <span>
                  Order #{o.id} — GHS {o.agreed_price_ghs}
                </span>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                    {o.status}
                  </span>
                  {o.status === "accepted" && (
                    <button
                      onClick={() => handlePay(o)}
                      disabled={busyId === o.id}
                      className="text-xs font-medium text-brand-green hover:underline disabled:opacity-50"
                    >
                      Pay via MoMo
                    </button>
                  )}
                  {(o.status === "pending" || o.status === "accepted") && (
                    <button
                      onClick={() => handleCancelOrder(o)}
                      disabled={busyId === o.id}
                      className="text-gray-400 hover:text-red-600"
                      title="Cancel order"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
              {paymentMessage[o.id] && <p className="text-xs text-gray-500 mt-1">{paymentMessage[o.id]}</p>}
            </div>
          ))}
          {myOrders?.results.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No orders placed yet.</p>}
        </div>
      </section>
    </div>
  );
}
