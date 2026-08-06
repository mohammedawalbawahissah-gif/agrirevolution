import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, ProduceListing } from "../../types";

export default function MarketplaceTab() {
  const { user } = useAuth();
  // Backend already scopes this to the logged-in farmer's own listings.
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    user ? "/marketplace/listings/" : null,
    [user?.id]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAddListing() {
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/marketplace/listings/", {
        crop,
        quantity_kg: parseFloat(quantity),
        photo_url: photoUrl || undefined,
        listed_via: "app",
      });
      setCrop("");
      setQuantity("");
      setPhotoUrl("");
      setFormOpen(false);
      refetch();
    } catch {
      setError("Could not list produce. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Marketplace</h2>
          <p className="text-sm text-gray-500 mt-1">Sell your produce with AI-graded fair pricing</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90"
        >
          + List Produce
        </button>
      </div>

      {formOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold mb-3">List Produce for Sale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop</label>
              <input
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="e.g. Maize"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
              <input
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo URL <span className="text-gray-400 font-normal">(optional — enables AI grading)</span>
              </label>
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddListing}
              disabled={isSubmitting}
              className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Listing…" : "List Produce"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y">
        {isLoading && <p className="px-5 py-4 text-sm text-gray-400">Loading…</p>}
        {listings?.results.map((l) => (
          <div key={l.id} className="px-5 py-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">
                {l.quantity_kg}kg {l.crop}
              </p>
              <p className="text-gray-500 mt-0.5">
                Grade: {l.ai_grade === "ungraded" ? "Pending AI review" : l.ai_grade}
                {l.fair_price_band_low_ghs && l.fair_price_band_high_ghs
                  ? ` · GHS ${l.fair_price_band_low_ghs}–${l.fair_price_band_high_ghs}`
                  : ""}
              </p>
              {l.ai_grading_notes && (
                <p className="text-gray-400 text-xs mt-1 max-w-md">{l.ai_grading_notes}</p>
              )}
            </div>
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
              {l.status}
            </span>
          </div>
        ))}
        {!isLoading && listings?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No produce listed yet. Tap "List Produce" to sell your first batch.
          </p>
        )}
      </div>
    </div>
  );
}
