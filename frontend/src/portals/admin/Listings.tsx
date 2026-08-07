import { useState } from "react";
import { Sprout } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import type { Paginated, ProduceListing } from "../../types";

const STATUSES: ProduceListing["status"][] = ["listed", "reserved", "sold", "expired"];
const GRADES: ProduceListing["ai_grade"][] = ["ungraded", "A", "B", "C"];

export default function AdminListings() {
  const { data: listings, isLoading, refetch } = useFetch<Paginated<ProduceListing>>(
    "/marketplace/listings/"
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();

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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Produce Listings</h1>
        <p className="text-page-subtitle">
          Every listing across the marketplace — override the AI grade manually if needed
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {listings?.results.length ? (
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
              {listings.results.map((l) => (
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
        ) : !isLoading ? (
          <EmptyState icon={Sprout} title="No listings yet" description="Produce listings will appear here." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
