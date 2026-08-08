import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import type { Paginated, EquipmentBooking } from "../../types";

// Each status's forward moves only — a dealer walks a booking through this
// sequence rather than jumping to an arbitrary status. "cancelled" is
// offered from any non-terminal state.
const NEXT_STATUS: Record<EquipmentBooking["status"], EquipmentBooking["status"] | null> = {
  requested: "confirmed",
  confirmed: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
};

const NEXT_LABEL: Record<string, string> = {
  confirmed: "Confirm Booking",
  in_progress: "Start Job",
  completed: "Mark Completed",
};

export default function DealerBookings() {
  const { user } = useAuth();
  // Backend already scopes /equipment/bookings/ to this dealer's own equipment.
  const { data: bookings, refetch } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id]
  );
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openBookingId, setOpenBookingId] = useState<number | null>(null);

  const openBooking = bookings?.results.find((b) => b.id === openBookingId) ?? null;

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

  function actionsFor(booking: EquipmentBooking): DetailAction[] {
    const actions: DetailAction[] = [];
    const next = NEXT_STATUS[booking.status];
    if (next) {
      actions.push({
        label: NEXT_LABEL[next],
        variant: "primary",
        onClick: () => updateBookingStatus(booking, next),
      });
    }
    if (booking.status !== "cancelled" && booking.status !== "completed") {
      actions.push({
        label: "Cancel Booking",
        variant: "danger",
        onClick: () => updateBookingStatus(booking, "cancelled"),
      });
    }
    return actions;
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
              <button
                key={b.id}
                onClick={() => setOpenBookingId(b.id)}
                className={`w-full text-left px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors ${busyId === b.id ? "opacity-50" : ""}`}
              >
                <span className="text-gray-900">
                  Booking #{b.id} — {b.farmer_name} · {b.acreage} acres on {b.requested_date}
                  {b.total_cost_ghs && <span className="text-gray-400"> · GHS {b.total_cost_ghs}</span>}
                </span>
                <StatusBadge status={b.status} />
              </button>
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

      <DetailModal
        isOpen={openBooking !== null}
        onClose={() => setOpenBookingId(null)}
        title={`Booking #${openBooking?.id ?? ""}`}
        status={openBooking?.status}
        isBusy={busyId === openBooking?.id}
        fields={
          openBooking
            ? [
                { label: "Equipment", value: openBooking.equipment_name },
                { label: "Farmer", value: openBooking.farmer_name },
                { label: "Acreage", value: `${openBooking.acreage} acres` },
                { label: "Date", value: openBooking.requested_date },
                { label: "Cost", value: openBooking.total_cost_ghs ? `GHS ${openBooking.total_cost_ghs}` : "—" },
                { label: "Delivery", value: openBooking.delivery_method === "delivery" ? "We deliver" : "Farmer picks up" },
                ...(openBooking.delivery_location ? [{ label: "Location", value: openBooking.delivery_location }] : []),
                { label: "Payment channel", value: openBooking.payment_channel || "—" },
              ]
            : []
        }
        actions={openBooking ? actionsFor(openBooking) : []}
      />
    </div>
  );
}
