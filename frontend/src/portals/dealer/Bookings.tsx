import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
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
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function updateBookingStatus(booking: EquipmentBooking, status: EquipmentBooking["status"]) {
    setBusyId(booking.id);
    try {
      await apiClient.patch(`/equipment/bookings/${booking.id}/`, { status });
      toast.success(`Booking #${booking.id} marked ${status.replace("_", " ")}`);
      refetch();
    } catch {
      toast.error("Couldn't update this booking.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-page-title">Bookings</h1>
        <p className="text-page-subtitle">Requests against your equipment</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        {bookings?.results.length ? (
          <div className="divide-y divide-gray-100">
            {bookings.results.map((b) => (
              <div
                key={b.id}
                className={`px-5 py-3 flex items-center justify-between text-sm ${busyId === b.id ? "opacity-50" : ""}`}
              >
                <span className="text-gray-900">
                  Booking #{b.id} — {b.acreage} acres on {b.requested_date}
                  {b.total_cost_ghs && <span className="text-gray-400"> · GHS {b.total_cost_ghs}</span>}
                </span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <select
                    value={b.status}
                    disabled={busyId === b.id}
                    onChange={(e) => updateBookingStatus(b, e.target.value as EquipmentBooking["status"])}
                    className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 capitalize focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    {BOOKING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No bookings yet"
            description="Requests for your equipment will show up here."
          />
        )}
      </section>
    </div>
  );
}
