import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, EquipmentBooking } from "../../types";

const STATUSES: EquipmentBooking["status"][] = [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  in_progress: "bg-purple-50 text-purple-700",
  completed: "bg-green-50 text-brand-green",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminBookings() {
  const { data: bookings, isLoading, refetch } = useFetch<Paginated<EquipmentBooking>>(
    "/equipment/bookings/"
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  async function updateStatus(booking: EquipmentBooking, status: EquipmentBooking["status"]) {
    setBusyId(booking.id);
    try {
      await apiClient.patch(`/equipment/bookings/${booking.id}/`, { status });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Equipment Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">All bookings across every farmer and dealer</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Booking</th>
              <th className="text-left px-5 py-3 font-medium">Farmer</th>
              <th className="text-left px-5 py-3 font-medium">Acreage</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-5 py-3 font-medium">Cost</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings?.results.map((b) => (
              <tr key={b.id} className={busyId === b.id ? "opacity-50" : ""}>
                <td className="px-5 py-3 font-medium">#{b.id}</td>
                <td className="px-5 py-3 text-gray-600">Farmer #{b.farmer}</td>
                <td className="px-5 py-3 text-gray-600">{b.acreage} acres</td>
                <td className="px-5 py-3 text-gray-600">{b.requested_date}</td>
                <td className="px-5 py-3 text-gray-600">
                  {b.total_cost_ghs ? `GHS ${b.total_cost_ghs}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={b.status}
                    disabled={busyId === b.id}
                    onChange={(e) => updateStatus(b, e.target.value as EquipmentBooking["status"])}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 capitalize ${STATUS_STYLES[b.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && bookings?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No bookings yet.</p>
        )}
        {isLoading && <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}
