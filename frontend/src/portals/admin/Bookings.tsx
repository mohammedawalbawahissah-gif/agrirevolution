import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import type { Paginated, EquipmentBooking } from "../../types";

const STATUSES: EquipmentBooking["status"][] = [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export default function AdminBookings() {
  const { data: bookings, isLoading, refetch } = useFetch<Paginated<EquipmentBooking>>(
    "/equipment/bookings/"
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();

  async function updateStatus(booking: EquipmentBooking, status: EquipmentBooking["status"]) {
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Equipment Bookings</h1>
        <p className="text-page-subtitle">All bookings across every farmer and dealer</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {bookings?.results.length ? (
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
              {bookings.results.map((b) => (
                <tr key={b.id} className={busyId === b.id ? "opacity-50" : ""}>
                  <td className="px-5 py-3 font-medium text-gray-900">#{b.id}</td>
                  <td className="px-5 py-3 text-gray-600">Farmer #{b.farmer}</td>
                  <td className="px-5 py-3 text-gray-600">{b.acreage} acres</td>
                  <td className="px-5 py-3 text-gray-600">{b.requested_date}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {b.total_cost_ghs ? `GHS ${b.total_cost_ghs}` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={b.status} />
                      <select
                        value={b.status}
                        disabled={busyId === b.id}
                        onChange={(e) => updateStatus(b, e.target.value as EquipmentBooking["status"])}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 capitalize focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
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
          <EmptyState icon={CalendarClock} title="No bookings yet" description="Equipment bookings will appear here." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
