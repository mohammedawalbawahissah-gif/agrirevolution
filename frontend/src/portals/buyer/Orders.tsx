import { useState, useMemo } from "react";
import { XCircle, ClipboardList, Pencil } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import type { Paginated, Order, PaymentChannel } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];

export default function BuyerOrders() {
  const { user } = useAuth();
  // Backend already scopes /marketplace/orders/ to this buyer's own orders.
  const { data: myOrders, refetch } = useFetch<Paginated<Order>>(user ? "/marketplace/orders/" : null, [user?.id]);
  const toast = useToast();
  const confirm = useConfirm();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    if (!myOrders?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return myOrders.results;
    return myOrders.results.filter(
      (o) =>
        (o.listing_crop ?? "").toLowerCase().includes(q) ||
        (o.farmer_name ?? "").toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
    );
  }, [myOrders, search]);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editDeliveryMethod, setEditDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [editDeliveryAddress, setEditDeliveryAddress] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentChannel | "">("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit(order: Order) {
    setEditingOrder(order);
    setEditDeliveryMethod(order.delivery_method);
    setEditDeliveryAddress(order.delivery_address);
    setEditPaymentMethod(order.payment_method);
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editingOrder) return;
    setEditError("");
    if (editDeliveryMethod === "delivery" && !editDeliveryAddress.trim()) {
      setEditError("Delivery address is required for delivery orders.");
      return;
    }
    setIsSavingEdit(true);
    try {
      await apiClient.patch(`/marketplace/orders/${editingOrder.id}/`, {
        delivery_method: editDeliveryMethod,
        delivery_address: editDeliveryMethod === "delivery" ? editDeliveryAddress : "",
        payment_method: editPaymentMethod || undefined,
      });
      toast.success(`Order #${editingOrder.id} updated`);
      setEditingOrder(null);
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { non_field_errors?: string[] } } })?.response?.data?.non_field_errors?.[0];
      setEditError(message || "Couldn't save changes. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-page-title">My Orders</h1>
          <p className="text-page-subtitle">Track and pay for produce you've ordered</p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders…" className="w-56" />
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredOrders.length ? (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((o) => (
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
                    {o.status === "pending" && (
                      <button
                        onClick={() => openEdit(o)}
                        disabled={busyId === o.id}
                        className="text-gray-400 hover:text-brand-green transition-colors"
                        title="Edit order"
                      >
                        <Pencil size={16} />
                      </button>
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
            title={search ? "No orders match your search" : "No orders placed yet"}
            description={search ? undefined : "Produce you order from the marketplace will show up here."}
          />
        )}
      </section>

      {editingOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Edit Order #{editingOrder.id}</h3>

            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery</label>
            <select
              value={editDeliveryMethod}
              onChange={(e) => setEditDeliveryMethod(e.target.value as "pickup" | "delivery")}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 bg-white"
            >
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>

            {editDeliveryMethod === "delivery" && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <input
                  value={editDeliveryAddress}
                  onChange={(e) => setEditDeliveryAddress(e.target.value)}
                  placeholder="Where should this be delivered?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
                />
              </>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value as PaymentChannel)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 bg-white"
            >
              <option value="">Not specified</option>
              {PAYMENT_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {PAYMENT_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>

            {editError && <p className="text-sm text-red-600 mb-2">{editError}</p>}
            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="w-full bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isSavingEdit ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditingOrder(null)} className="w-full text-center text-sm text-gray-500 mt-3">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
