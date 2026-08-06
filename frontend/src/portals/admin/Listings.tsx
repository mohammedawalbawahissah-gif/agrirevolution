import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, ProduceListing } from "../../types";

const STATUSES: ProduceListing["status"][] = ["listed", "reserved", "sold", "expired"];
const GRADES: ProduceListing["ai_grade"][] = ["ungraded", "A", "B", "C"];

const STATUS_STYLES: Record<string, string> = {
  listed: "bg-green-50 text-brand-green",
  reserved: "bg-blue-50 text-blue-700",
  sold: "bg-gray-100 text-gray-600",
  expired: "bg-red-50 text-red-700",
};

export default function AdminListings() {
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    "/marketplace/listings/"
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  async function updateField(
    listing: ProduceListing,
    field: "status" | "ai_grade",
    value: string
  ) {
    setBusyId(listing.id);
    try {
      await apiClient.patch(`/marketplace/listings/${listing.id}/`, { [field]: value });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Produce Listings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every listing across the marketplace — override the AI grade manually if needed
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
            {listings?.results.map((l) => (
              <tr key={l.id} className={busyId === l.id ? "opacity-50" : ""}>
                <td className="px-5 py-3 font-medium">
                  {l.quantity_kg}kg {l.crop}
                </td>
                <td className="px-5 py-3 text-gray-600">Farmer #{l.farmer}</td>
                <td className="px-5 py-3">
                  <select
                    value={l.ai_grade}
                    disabled={busyId === l.id}
                    onChange={(e) => updateField(l, "ai_grade", e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-1 text-sm"
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
                  <select
                    value={l.status}
                    disabled={busyId === l.id}
                    onChange={(e) => updateField(l, "status", e.target.value)}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 capitalize ${STATUS_STYLES[l.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && listings?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No listings yet.</p>
        )}
        {isLoading && <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}
