import { useState } from "react";
import { CloudSun, ScanSearch } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, PlantingRecommendation, ProduceListing } from "../../types";

const ACTION_LABELS: Record<PlantingRecommendation["recommended_action"], string> = {
  plant: "Time to plant",
  harvest: "Time to harvest",
  request_equipment: "Request equipment now",
  hold: "Hold — wait for better conditions",
};

function WeatherGuidanceSection() {
  const { user } = useAuth();
  const { data: recommendations, isLoading, refetch } = useFetch<Paginated<PlantingRecommendation>>(
    user ? "/weather/recommendations/" : null,
    [user?.id]
  );

  const [crop, setCrop] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!crop.trim()) return;
    setError("");
    setIsGenerating(true);
    try {
      await apiClient.post("/weather/recommendations/generate/", { crop: crop.trim() });
      setCrop("");
      refetch();
    } catch {
      setError("Could not get guidance right now. Please try again in a moment.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CloudSun size={18} className="text-brand-green" />
        <h2 className="font-semibold">Weather Guidance</h2>
      </div>
      <p className="text-sm text-gray-500 -mt-2">AI-driven timing for planting, harvest, and equipment requests</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Get guidance for a crop</label>
        <div className="flex gap-3">
          <input
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder="e.g. Maize, Groundnuts, Tomatoes"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !crop.trim()}
            className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            {isGenerating ? "Thinking…" : "Get Guidance"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="space-y-3">
        {recommendations?.results.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{r.crop}</p>
              <span className="text-xs text-gray-400">
                {r.recommended_window_start} – {r.recommended_window_end}
              </span>
            </div>
            <p className="text-brand-green text-sm font-medium mt-1">{ACTION_LABELS[r.recommended_action]}</p>
            <p className="text-sm text-gray-600 mt-2">{r.ai_rationale}</p>
          </div>
        ))}
        {!isLoading && recommendations?.results.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">No weather guidance yet — ask above for your first crop.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProduceGradingSection() {
  const { user } = useAuth();
  // Backend already scopes this to the logged-in farmer's own listings.
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    user ? "/marketplace/listings/" : null,
    [user?.id]
  );

  const [photoUrlDrafts, setPhotoUrlDrafts] = useState<Record<number, string>>({});
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [error, setError] = useState<Record<number, string>>({});

  async function handleGrade(listing: ProduceListing) {
    const draftUrl = photoUrlDrafts[listing.id]?.trim();
    setError((e) => ({ ...e, [listing.id]: "" }));
    setGradingId(listing.id);
    try {
      if (draftUrl && draftUrl !== listing.photo_url) {
        await apiClient.patch(`/marketplace/listings/${listing.id}/`, { photo_url: draftUrl });
      }
      await apiClient.post(`/marketplace/listings/${listing.id}/grade/`);
      refetch();
    } catch {
      setError((e) => ({ ...e, [listing.id]: "Grading failed — check the photo URL and try again." }));
    } finally {
      setGradingId(null);
    }
  }

  const ungraded = listings?.results.filter((l) => l.ai_grade === "ungraded") ?? [];
  const graded = listings?.results.filter((l) => l.ai_grade !== "ungraded") ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ScanSearch size={18} className="text-brand-green" />
        <h2 className="font-semibold">Produce Grading</h2>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        Add a photo to any listing and get an AI-assessed grade plus a fair price band
      </p>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      {ungraded.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
          {ungraded.map((listing) => (
            <div key={listing.id} className="p-5 space-y-3">
              <p className="font-medium text-sm">
                {listing.quantity_kg}kg {listing.crop}
              </p>
              <div className="flex gap-3">
                <input
                  value={photoUrlDrafts[listing.id] ?? listing.photo_url ?? ""}
                  onChange={(e) => setPhotoUrlDrafts((d) => ({ ...d, [listing.id]: e.target.value }))}
                  placeholder="https://... photo URL"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <button
                  onClick={() => handleGrade(listing)}
                  disabled={gradingId === listing.id || !(photoUrlDrafts[listing.id] ?? listing.photo_url)}
                  className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  {gradingId === listing.id ? "Grading…" : "Grade with AI"}
                </button>
              </div>
              {error[listing.id] && <p className="text-sm text-red-600">{error[listing.id]}</p>}
            </div>
          ))}
        </div>
      )}

      {ungraded.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-400">
            No ungraded listings right now — list produce with a photo to see it here.
          </p>
        </div>
      )}

      {graded.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Already graded</p>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
            {graded.map((listing) => (
              <div key={listing.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>
                  {listing.quantity_kg}kg {listing.crop}
                </span>
                <span className="text-brand-green font-medium">Grade {listing.ai_grade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function AIAssistant() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Weather guidance and produce grading, powered by AI
        </p>
      </div>

      <WeatherGuidanceSection />
      <ProduceGradingSection />
    </div>
  );
}
