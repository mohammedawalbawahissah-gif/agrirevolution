import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import type { Equipment, Paginated, EquipmentBooking, User } from "../../types";

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
  const { data: farmers } = useFetch<Paginated<User>>("/accounts/users/?role=farmer");
  const { data: equipmentList } = useFetch<Paginated<Equipment>>("/equipment/equipment/?is_available=true");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openBookingId, setOpenBookingId] = useState<number | null>(null);
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [farmerId, setFarmerId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [acreage, setAcreage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const openBooking = bookings?.results.find((b) => b.id === openBookingId) ?? null;

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

  async function handleCreateOnBehalf() {
    setError("");
    if (!farmerId || !equipmentId) {
      setError("Choose both a farmer and a piece of equipment.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/bookings/", {
        farmer: Number(farmerId),
        equipment: Number(equipmentId),
        requested_date: requestedDate,
        acreage: parseFloat(acreage),
        requested_via: "app",
      });
      toast.success("Booking created on behalf of the farmer");
      setFormOpen(false);
      setFarmerId("");
      setEquipmentId("");
      setRequestedDate("");
      setAcreage("");
      refetch();
    } catch {
      setError("Couldn't create this booking. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Admin can move a booking to any status, unlike the dealer's sequential
  // flow — one button per status other than the one it's already in.
  function actionsFor(booking: EquipmentBooking): DetailAction[] {
    return STATUSES.filter((s) => s !== booking.status).map((s) => ({
      label: `Mark ${s.replace("_", " ")}`,
      variant: s === "cancelled" ? "danger" : "secondary",
      onClick: () => updateStatus(booking, s),
    }));
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Equipment Bookings</h1>
          <p className="text-page-subtitle">All bookings across every farmer and dealer</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90"
        >
          <Plus size={16} />
          Book on Behalf of a Farmer
        </button>
      </div>

      {formOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold mb-3">Book Equipment on Behalf of a Farmer</h3>
          <p className="text-xs text-gray-500 mb-4">
            For farmers who can't make bookings themselves — the booking appears under their account as normal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farmer</label>
              <select
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select a farmer…</option>
                {farmers?.results.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.first_name} {f.last_name} (@{f.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select equipment…</option>
                {equipmentList?.results.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} — GHS {eq.rate_per_acre_ghs}/acre
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acreage</label>
              <input
                type="number"
                step="0.1"
                value={acreage}
                onChange={(e) => setAcreage(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateOnBehalf}
              disabled={isSubmitting}
              className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Booking…" : "Create Booking"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {bookings?.results.length ? (
          <div className="overflow-x-auto">
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
                  <tr
                    key={b.id}
                    onClick={() => setOpenBookingId(b.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${busyId === b.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">#{b.id}</td>
                    <td className="px-5 py-3 text-gray-600">{b.farmer_name}</td>
                    <td className="px-5 py-3 text-gray-600">{b.acreage} acres</td>
                    <td className="px-5 py-3 text-gray-600">{b.requested_date}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {b.total_cost_ghs ? `GHS ${b.total_cost_ghs}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !isLoading ? (
          <EmptyState icon={CalendarClock} title="No bookings yet" description="Equipment bookings will appear here." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>

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
                { label: "Dealer", value: openBooking.dealer_name },
                { label: "Farmer", value: openBooking.farmer_name },
                { label: "Acreage", value: `${openBooking.acreage} acres` },
                { label: "Date", value: openBooking.requested_date },
                { label: "Cost", value: openBooking.total_cost_ghs ? `GHS ${openBooking.total_cost_ghs}` : "—" },
                { label: "Delivery", value: openBooking.delivery_method === "delivery" ? "Dealer delivers" : "Farmer picks up" },
                { label: "Payment channel", value: openBooking.payment_channel || "—" },
              ]
            : []
        }
        actions={openBooking ? actionsFor(openBooking) : []}
      />
    </div>
  );
}
