import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, ProduceListing } from "../../types";

export default function BuyerMarketplace() {
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    "/marketplace/listings/?status=listed"
  );
  const [placingOrderFor, setPlacingOrderFor] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handlePlaceOrder(listing: ProduceListing) {
    setError("");
    setPlacingOrderFor(listing.id);
    try {
      const fallbackPrice = listing.fair_price_band_low_ghs ?? "0";
      await apiClient.post("/marketplace/orders/", {
        listing: listing.id,
        agreed_price_ghs: fallbackPrice,
      });
      refetch();
    } catch {
      setError("Could not place order. Please try again.");
    } finally {
      setPlacingOrderFor(null);
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
              </div>
              <button
                onClick={() => handlePlaceOrder(l)}
                disabled={placingOrderFor === l.id}
                className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                {placingOrderFor === l.id ? "Placing..." : "Place Order"}
              </button>
            </div>
          ))}
          {listings?.results.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No produce listed right now.</p>
          )}
        </div>
      </section>
    </div>
  );
}
