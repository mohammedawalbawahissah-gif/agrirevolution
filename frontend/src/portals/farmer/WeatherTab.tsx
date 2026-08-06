import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, PlantingRecommendation } from "../../types";

const ACTION_LABELS: Record<PlantingRecommendation["recommended_action"], string> = {
  plant: "Time to plant",
  harvest: "Time to harvest",
  request_equipment: "Request equipment now",
  hold: "Hold — wait for better conditions",
};

export default function WeatherTab() {
  const { user } = useAuth();
  // Backend already scopes this to the logged-in farmer's own recommendations.
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Weather Guidance</h2>
        <p className="text-sm text-gray-500 mt-1">
          AI-driven timing for planting, harvest, and equipment requests
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
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
          <div key={r.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{r.crop}</p>
              <span className="text-xs text-gray-400">
                {r.recommended_window_start} – {r.recommended_window_end}
              </span>
            </div>
            <p className="text-brand-green text-sm font-medium mt-1">
              {ACTION_LABELS[r.recommended_action]}
            </p>
            <p className="text-sm text-gray-600 mt-2">{r.ai_rationale}</p>
          </div>
        ))}
        {!isLoading && recommendations?.results.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">
              No weather guidance yet — ask above for your first crop.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
