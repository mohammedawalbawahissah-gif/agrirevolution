import { useState, useMemo } from "react";
import { Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import { INPUT_CATEGORY_LABELS, PAYMENT_CHANNEL_LABELS } from "../../types";
import type { Paginated, InputProduct, InputOrder, PaymentChannel } from "../../types";

const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];

export default function FarmerInputs() {
  const { user } = useAuth();
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useFetch<Paginated<InputProduct>>(
    "/inputs/products/?active_only=true"
  );
  const { data: orders, refetch: refetchOrders } = useFetch<Paginated<InputOrder>>(
    user ? "/inputs/orders/" : null,
    [user?.id]
  );
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");

  // Order form is shared for both "place new order" and "edit pending order".
  const [formTarget, setFormTarget] = useState<{ product: InputProduct; order?: InputOrder } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredProducts = useMemo(() => {
    if (!products?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products.results;
    return products.results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        INPUT_CATEGORY_LABELS[p.category].toLowerCase().includes(q) ||
        (p.dealer_name ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  function openOrderForm(product: InputProduct, order?: InputOrder) {
    setError("");
    setFormTarget({ product, order });
    setQuantity(order ? String(order.quantity) : "1");
    setDeliveryMethod(order?.delivery_method ?? "pickup");
    setDeliveryLocation(order?.delivery_location ?? "");
    setPaymentChannel(order?.payment_channel ?? "");
  }

  async function handleSubmitOrder() {
    if (!formTarget) return;
    setError("");
    setIsSubmitting(true);
    const payload = {
      quantity: parseInt(quantity, 10),
      delivery_method: deliveryMethod,
      delivery_location: deliveryLocation || undefined,
      payment_channel: paymentChannel || undefined,
    };
    try {
      if (formTarget.order) {
        await apiClient.patch(`/inputs/orders/${formTarget.order.id}/`, payload);
        toast.success("Order updated.");
      } else {
        await apiClient.post("/inputs/orders/", { ...payload, product: formTarget.product.id });
        toast.success("Order placed.");
      }
      setFormTarget(null);
      refetchProducts();
      refetchOrders();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { quantity?: string[]; non_field_errors?: string[] } } })?.response?.data;
      setError(message?.quantity?.[0] || message?.non_field_errors?.[0] || "Could not save this order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelOrder(order: InputOrder) {
    const ok = await confirm({
      title: `Cancel order #${order.id}?`,
      description: "This can't be undone.",
      confirmLabel: "Cancel order",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await apiClient.patch(`/inputs/orders/${order.id}/`, { status: "cancelled" });
      toast.success(`Order #${order.id} cancelled`);
      refetchProducts();
      refetchOrders();
    } catch {
      toast.error("Couldn't cancel this order.");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-page-title">Farm Inputs</h1>
          <p className="text-page-subtitle">Seeds, fertilizer, and agrochemicals from input dealers</p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="w-64" />
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {filteredProducts.length ? (
          filteredProducts.map((p) => (
            <div key={p.id} className="px-5 py-4 flex items-center justify-between text-sm gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {p.photo_url && <img src={p.photo_url} className="w-12 h-12 object-cover rounded shrink-0" alt="" />}
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    GHS {p.price_ghs}/{p.unit} · {p.stock_quantity} in stock
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {INPUT_CATEGORY_LABELS[p.category]} · {p.dealer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => openOrderForm(p)}
                disabled={p.stock_quantity === 0}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                {p.stock_quantity === 0 ? "Out of Stock" : "Order"}
              </button>
            </div>
          ))
        ) : (
          <EmptyState
            icon={Package}
            title={search ? "No products match your search" : "No inputs available right now"}
            description={search ? undefined : "Check back once an input dealer lists something."}
          />
        )}
      </section>

      {orders && orders.results.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3">My Orders</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {orders.results.map((o) => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between text-sm gap-4">
                <div>
                  <p className="font-medium">
                    {o.product_name} × {o.quantity}
                  </p>
                  <p className="text-gray-500 mt-0.5">{o.total_price_ghs ? `GHS ${o.total_price_ghs}` : "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.status} />
                  {o.status === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          openOrderForm(
                            products?.results.find((p) => p.id === o.product) ?? {
                              id: o.product,
                              dealer: 0,
                              name: o.product_name ?? "",
                              category: "other",
                              unit: "",
                              price_ghs: "0",
                              stock_quantity: 999999,
                              is_active: true,
                              description: "",
                              photo_url: "",
                              created_at: "",
                            },
                            o
                          )
                        }
                        className="text-xs font-medium text-brand-green hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancelOrder(o)}
                        className="text-xs font-medium text-status-danger hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {formTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">
              {formTarget.order ? "Edit Order" : `Order ${formTarget.product.name}`}
            </h3>

            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery</label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as "pickup" | "delivery")}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 bg-white"
            >
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>

            {deliveryMethod === "delivery" && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
                <input
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
                />
              </>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentChannel}
              onChange={(e) => setPaymentChannel(e.target.value as PaymentChannel)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 bg-white"
            >
              <option value="">Not specified</option>
              {PAYMENT_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {PAYMENT_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : formTarget.order ? "Save Changes" : "Place Order"}
            </button>
            <button onClick={() => setFormTarget(null)} className="w-full text-center text-sm text-gray-500 mt-3">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
