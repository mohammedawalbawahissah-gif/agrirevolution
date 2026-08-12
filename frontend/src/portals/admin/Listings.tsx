import { useState, useMemo } from "react";
import { Plus, Sprout } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import type { Paginated, PaymentChannel, ProduceListing, User } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

const STATUSES: ProduceListing["status"][] = ["listed", "reserved", "sold", "expired"];
const GRADES: ProduceListing["ai_grade"][] = ["ungraded", "A", "B", "C"];
const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];
const DELIVERY_OPTIONS: { value: "pickup" | "delivery" | "both"; label: string }[] = [
  { value: "pickup", label: "Pickup Only" },
  { value: "delivery", label: "Delivery Only" },
  { value: "both", label: "Pickup or Delivery" },
];

export default function AdminListings() {
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    "/marketplace/listings/"
  );
  const { data: farmers } = useFetch<Paginated<User>>("/accounts/users/?role=farmer");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filteredListings = useMemo(() => {
    if (!listings?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return listings.results;
    return listings.results.filter(
      (l) => l.crop.toLowerCase().includes(q) || String(l.farmer).includes(q)
    );
  }, [listings, search]);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [farmerId, setFarmerId] = useState("");
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery" | "both">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<PaymentChannel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function togglePaymentMethod(channel: PaymentChannel) {
    setAcceptedPaymentMethods((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  async function updateField(
    listing: ProduceListing,
    field: "status" | "ai_grade",
    value: string
  ) {
    setBusyId(listing.id);
    try {
      await apiClient.patch(`/marketplace/listings/${listing.id}/`, { [field]: value });
      toast.success(field === "status" ? `Listing #${listing.id} marked ${value}` : `Grade updated`);
      refetch();
    } catch {
      toast.error("Couldn't update this listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateOnBehalf() {
    setError("");
    if (!farmerId) {
      setError("Choose which farmer this listing is for.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/marketplace/listings/", {
        farmer: Number(farmerId),
        crop,
        quantity_kg: parseFloat(quantity),
        listed_via: "app",
        delivery_method: deliveryMethod,
        delivery_location: deliveryLocation || undefined,
        accepted_payment_methods: acceptedPaymentMethods,
      });
      toast.success(`Listed ${crop} on behalf of the farmer`);
      setFormOpen(false);
      setFarmerId("");
      setCrop("");
      setQuantity("");
      setDeliveryMethod("pickup");
      setDeliveryLocation("");
      setAcceptedPaymentMethods([]);
      refetch();
    } catch {
      setError("Couldn't create this listing. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Produce Listings</h1>
          <p className="text-page-subtitle">
            Every listing across the marketplace — override the AI grade manually if needed
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90"
        >
          <Plus size={16} />
          List on Behalf of a Farmer
        </button>
      </div>

      {formOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold mb-3">List Produce on Behalf of a Farmer</h3>
          <p className="text-xs text-gray-500 mb-4">
            For farmers who can't list produce themselves — the listing appears under their account as normal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farmer</label>
              <select
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select a farmer…</option>
                {farmers?.results.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.first_name} {f.last_name} (@{f.username})
                  </option>
                ))}
              </select>
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery</label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as "pickup" | "delivery" | "both")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                {DELIVERY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {deliveryMethod === "pickup" ? "Pickup Location" : "Location / Delivery Area"}
              </label>
              <input
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g. Tamale central market"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Accepted Payment Methods</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_CHANNELS.map((channel) => (
                  <label
                    key={channel}
                    className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer ${
                      acceptedPaymentMethods.includes(channel)
                        ? "bg-brand-green text-white border-brand-green"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={acceptedPaymentMethods.includes(channel)}
                      onChange={() => togglePaymentMethod(channel)}
                    />
                    {PAYMENT_CHANNEL_LABELS[channel]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateOnBehalf}
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

      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by crop or farmer…" className="max-w-xs" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredListings.length ? (
          <div className="overflow-x-auto">
<table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Produce</th>
                <th className="text-left px-5 py-3 font-medium">Farmer</th>
                <th className="text-left px-5 py-3 font-medium">Grade</th>
                <th className="text-left px-5 py-3 font-medium">Price Band</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredListings.map((l) => (
                <tr key={l.id} className={busyId === l.id ? "opacity-50" : ""}>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {l.quantity_kg}kg {l.crop}
                  </td>
                  <td className="px-5 py-3 text-gray-600">Farmer #{l.farmer}</td>
                  <td className="px-5 py-3">
                    <select
                      value={l.ai_grade}
                      disabled={busyId === l.id}
                      onChange={(e) => updateField(l, "ai_grade", e.target.value)}
                      className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g === "ungraded" ? "Ungraded" : `Grade ${g}`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {l.fair_price_band_low_ghs && l.fair_price_band_high_ghs
                      ? `GHS ${l.fair_price_band_low_ghs}–${l.fair_price_band_high_ghs}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={l.status} />
                      <select
                        value={l.status}
                        disabled={busyId === l.id}
                        onChange={(e) => updateField(l, "status", e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 capitalize focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        ) : !isLoading ? (
          <EmptyState
            icon={Sprout}
            title={search ? "No listings match your search" : "No listings yet"}
            description={search ? undefined : "Produce listings will appear here."}
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
