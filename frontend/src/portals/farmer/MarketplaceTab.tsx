import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import type { Paginated, PaymentChannel, ProduceListing } from "../../types";
import { PAYMENT_CHANNEL_LABELS } from "../../types";

const PAYMENT_CHANNELS = Object.keys(PAYMENT_CHANNEL_LABELS) as PaymentChannel[];
const GRADES: ("A" | "B" | "C")[] = ["A", "B", "C"];

export default function MarketplaceTab() {
  const { user } = useAuth();
  const toast = useToast();
  // Backend already scopes this to the logged-in farmer's own listings.
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    user ? "/marketplace/listings/" : null,
    [user?.id]
  );

  const [gradingListing, setGradingListing] = useState<ProduceListing | null>(null);
  const [manualGrade, setManualGrade] = useState<"A" | "B" | "C">("B");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPriceLow, setManualPriceLow] = useState("");
  const [manualPriceHigh, setManualPriceHigh] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  function openManualGrade(listing: ProduceListing) {
    setGradingListing(listing);
    setManualGrade(listing.ai_grade === "ungraded" ? "B" : (listing.ai_grade as "A" | "B" | "C"));
    setManualNotes("");
    setManualPriceLow(listing.fair_price_band_low_ghs ?? "");
    setManualPriceHigh(listing.fair_price_band_high_ghs ?? "");
  }

  async function handleManualGrade() {
    if (!gradingListing) return;
    setIsGrading(true);
    try {
      await apiClient.post(`/marketplace/listings/${gradingListing.id}/manual-grade/`, {
        grade: manualGrade,
        notes: manualNotes,
        price_band_low_ghs: manualPriceLow || undefined,
        price_band_high_ghs: manualPriceHigh || undefined,
      });
      toast.success("Grade saved.");
      setGradingListing(null);
      refetch();
    } catch {
      toast.error("Could not save your grade. Please try again.");
    } finally {
      setIsGrading(false);
    }
  }

  const [formOpen, setFormOpen] = useState(false);
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
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

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/marketplace/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMediaUrl(data.url);
      setMediaType(data.media_type);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Upload failed. Please try a different photo or video.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAddListing() {
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/marketplace/listings/", {
        crop,
        quantity_kg: parseFloat(quantity),
        photo_url: mediaUrl || undefined,
        media_type: mediaType || undefined,
        listed_via: "app",
        delivery_method: deliveryMethod,
        delivery_location: deliveryLocation || undefined,
        accepted_payment_methods: acceptedPaymentMethods,
      });
      setCrop("");
      setQuantity("");
      setMediaUrl("");
      setMediaType("");
      setDeliveryMethod("pickup");
      setDeliveryLocation("");
      setAcceptedPaymentMethods([]);
      setFormOpen(false);
      refetch();
    } catch {
      setError("Could not list produce. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
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
                Photo or Video <span className="text-gray-400 font-normal">(optional — a photo enables AI grading)</span>
              </label>
              {mediaUrl ? (
                <div className="flex items-center gap-3 border border-gray-300 rounded-md px-3 py-2">
                  {mediaType === "video" ? (
                    <video src={mediaUrl} className="w-14 h-14 object-cover rounded" muted />
                  ) : (
                    <img src={mediaUrl} className="w-14 h-14 object-cover rounded" alt="" />
                  )}
                  <p className="text-xs text-gray-500 flex-1">
                    {mediaType === "video" ? "Video attached" : "Photo attached"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl("");
                      setMediaType("");
                    }}
                    className="text-xs text-status-danger font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    onChange={(e) => handleFileSelected(e.target.files?.[0])}
                    disabled={isUploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-brand-green-light file:text-brand-green file:text-xs"
                  />
                  {isUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                  {uploadError && <p className="text-xs text-status-danger mt-1">{uploadError}</p>}
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery</label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as "pickup" | "delivery" | "both")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="pickup">Pickup Only</option>
                <option value="delivery">Delivery Only</option>
                <option value="both">Pickup or Delivery</option>
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
            <div className="md:col-span-2">
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
              onClick={handleAddListing}
              disabled={isSubmitting || isUploading}
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
          <div key={l.id} className="px-5 py-4 flex items-center justify-between text-sm gap-4">
            <div className="min-w-0">
              <p className="font-medium">
                {l.quantity_kg}kg {l.crop}
              </p>
              <p className="text-gray-500 mt-0.5">
                Grade:{" "}
                {l.ai_grade === "ungraded"
                  ? "Not graded yet"
                  : `${l.ai_grade}${l.grading_source === "manual" ? " (self-graded)" : l.grading_source === "ai" ? " (AI graded)" : ""}`}
                {l.fair_price_band_low_ghs && l.fair_price_band_high_ghs
                  ? ` · GHS ${l.fair_price_band_low_ghs}–${l.fair_price_band_high_ghs}`
                  : ""}
              </p>
              {l.ai_grading_notes && (
                <p className="text-gray-400 text-xs mt-1 max-w-md">{l.ai_grading_notes}</p>
              )}
              <button
                onClick={() => openManualGrade(l)}
                className="text-xs text-brand-green font-medium mt-1.5 hover:underline"
              >
                {l.ai_grade === "ungraded" ? "Grade it yourself" : "Edit grade"}
              </button>
            </div>
            <StatusBadge status={l.status} />
          </div>
        ))}
        {!isLoading && listings?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No produce listed yet. Tap "List Produce" to sell your first batch.
          </p>
        )}
      </div>

      {gradingListing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-1">
              Grade {gradingListing.quantity_kg}kg {gradingListing.crop}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              No photo, or you know your produce better than a picture can show? Grade it yourself.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <div className="flex gap-2 mb-3">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setManualGrade(g)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold border ${
                    manualGrade === g
                      ? "bg-brand-green text-white border-brand-green"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Fresh harvest, minor bruising on a few pieces"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 text-sm"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price low (GHS)</label>
                <input
                  value={manualPriceLow}
                  onChange={(e) => setManualPriceLow(e.target.value)}
                  inputMode="decimal"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price high (GHS)</label>
                <input
                  value={manualPriceHigh}
                  onChange={(e) => setManualPriceHigh(e.target.value)}
                  inputMode="decimal"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleManualGrade}
              disabled={isGrading}
              className="w-full bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isGrading ? "Saving…" : "Save Grade"}
            </button>
            <button
              onClick={() => setGradingListing(null)}
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
