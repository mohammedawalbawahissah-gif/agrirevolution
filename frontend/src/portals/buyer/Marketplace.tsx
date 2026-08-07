import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, PaymentChannel, ProduceListing } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

export default function BuyerMarketplace() {
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    "/marketplace/listings/?status=listed"
  );
  const [orderingListing, setOrderingListing] = useState<ProduceListing | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentChannel | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function openOrderModal(listing: ProduceListing) {
    setError("");
    setOrderingListing(listing);
    // Default to whichever delivery option the listing actually offers.
    setDeliveryMethod(listing.delivery_method === "delivery" ? "delivery" : "pickup");
    setDeliveryAddress("");
    setPaymentMethod(listing.accepted_payment_methods[0] ?? "");
  }

  async function handlePlaceOrder() {
    if (!orderingListing) return;
    setError("");
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) {
      setError("Delivery address is required for delivery orders.");
      return;
    }
    setIsSubmitting(true);
    try {
      const fallbackPrice = orderingListing.fair_price_band_low_ghs ?? "0";
      await apiClient.post("/marketplace/orders/", {
        listing: orderingListing.id,
        agreed_price_ghs: fallbackPrice,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === "delivery" ? deliveryAddress : undefined,
        payment_method: paymentMethod || undefined,
      });
      setOrderingListing(null);
      refetch();
    } catch {
      setError("Could not place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-1">Browse produce listed by farmers</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="divide-y">
          {isLoading && <p className="px-5 py-4 text-sm text-gray-400">Loading...</p>}
          {listings?.results.map((l) => (
            <div key={l.id} className="px-5 py-4 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">
                  {l.quantity_kg}kg {l.crop}
                </p>
                <p className="text-gray-500 mt-0.5">
                  Grade {l.ai_grade === "ungraded" ? "pending" : l.ai_grade}
                  {l.fair_price_band_low_ghs && l.fair_price_band_high_ghs
                    ? ` · GHS ${l.fair_price_band_low_ghs}–${l.fair_price_band_high_ghs}`
                    : ""}
                </p>
                {l.ai_grading_notes && <p className="text-gray-400 text-xs mt-1 max-w-md">{l.ai_grading_notes}</p>}
                {l.delivery_location && (
                  <p className="text-gray-400 text-xs mt-1 capitalize">
                    {l.delivery_method.replace("_", " ")} · {l.delivery_location}
                  </p>
                )}
              </div>
              <button
                onClick={() => openOrderModal(l)}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                Place Order
              </button>
            </div>
          ))}
          {listings?.results.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No produce listed right now.</p>
          )}
        </div>
      </section>

      {orderingListing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">
              Order {orderingListing.quantity_kg}kg {orderingListing.crop}
            </h3>

            {orderingListing.delivery_method === "both" && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as "pickup" | "delivery")}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 bg-white"
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                </select>
              </>
            )}
            {orderingListing.delivery_method !== "both" && (
              <p className="text-sm text-gray-500 mb-3 capitalize">
                {orderingListing.delivery_method} only
              </p>
            )}

            {deliveryMethod === "delivery" && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Where should this be delivered?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
                />
              </>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentChannel)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 bg-white"
            >
              {orderingListing.accepted_payment_methods.length === 0 && (
                <option value="">Not specified</option>
              )}
              {orderingListing.accepted_payment_methods.map((channel) => (
                <option key={channel} value={channel}>
                  {PAYMENT_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Placing…" : "Place Order"}
            </button>
            <button
              onClick={() => setOrderingListing(null)}
              className="w-full text-center text-sm text-gray-500 mt-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
