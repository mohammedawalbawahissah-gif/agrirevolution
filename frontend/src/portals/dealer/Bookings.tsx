import { useState } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import type { Paginated, EquipmentBooking } from "../../types";

const BOOKING_STATUSES: EquipmentBooking["status"][] = [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export default function DealerBookings() {
  const { user } = useAuth();
  // Backend already scopes /equipment/bookings/ to this dealer's own equipment.
  const { data: bookings, refetch } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id]
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  async function updateBookingStatus(booking: EquipmentBooking, status: EquipmentBooking["status"]) {
    setBusyId(booking.id);
    try {
      await apiClient.patch(`/equipment/bookings/${booking.id}/`, { status });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Requests against your equipment</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="divide-y">
          {bookings?.results.map((b) => (
            <div
              key={b.id}
              className={`px-5 py-3 flex items-center justify-between text-sm ${busyId === b.id ? "opacity-50" : ""}`}
            >
              <span>
                Booking #{b.id} — {b.acreage} acres on {b.requested_date}
                {b.total_cost_ghs && <span className="text-gray-400"> · GHS {b.total_cost_ghs}</span>}
              </span>
              <select
                value={b.status}
                disabled={busyId === b.id}
                onChange={(e) => updateBookingStatus(b, e.target.value as EquipmentBooking["status"])}
                className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 border-0 capitalize"
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {bookings?.results.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No bookings yet.</p>}
        </div>
      </section>
    </div>
  );
}
