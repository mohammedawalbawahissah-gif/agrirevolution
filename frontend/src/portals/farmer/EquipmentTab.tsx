import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, Equipment, EquipmentBooking } from "../../types";

export default function EquipmentTab() {
  const { user } = useAuth();
  const { data: equipment, isLoading } = useFetch<Paginated<Equipment>>(
    "/equipment/equipment/?is_available=true"
  );
  // Backend already scopes this to the logged-in farmer's own bookings.
  const { data: bookings, refetch: refetchBookings } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id]
  );

  const [selected, setSelected] = useState<Equipment | null>(null);
  const [acreage, setAcreage] = useState("");
  const [date, setDate] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");

  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<Record<number, string>>({});

  async function handleBook() {
    if (!selected) return;
    setError("");
    setIsBooking(true);
    try {
      await apiClient.post("/equipment/bookings/", {
        equipment: selected.id,
        requested_date: date,
        acreage: parseFloat(acreage),
        requested_via: "app",
      });
      setSelected(null);
      setAcreage("");
      setDate("");
      refetchBookings();
    } catch {
      setError("Could not submit request. Check the details and try again.");
    } finally {
      setIsBooking(false);
    }
  }

  async function handlePay(booking: EquipmentBooking) {
    if (!booking.total_cost_ghs) return;
    setPayingBookingId(booking.id);
    setPaymentMessage((m) => ({ ...m, [booking.id]: "" }));
    try {
      const { data: txn } = await apiClient.post("/payments/transactions/", {
        purpose: "equipment_booking",
        channel: "mtn_momo",
        amount_ghs: booking.total_cost_ghs,
        equipment_booking: booking.id,
      });
      const { data } = await apiClient.post(`/payments/transactions/${txn.id}/initiate/`);
      setPaymentMessage((m) => ({ ...m, [booking.id]: data.detail }));
    } catch {
      setPaymentMessage((m) => ({ ...m, [booking.id]: "Payment could not be started. Try again." }));
    } finally {
      setPayingBookingId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Equipment</h2>
        <p className="text-sm text-gray-500 mt-1">Request mechanized equipment, pay per use via MoMo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <p className="text-sm text-gray-400 col-span-2">Loading…</p>}
        {equipment?.results.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-gray-500 capitalize">{item.category}</p>
            <p className="text-brand-green font-semibold mt-2">GHS {item.rate_per_acre_ghs} / acre</p>
            <button
              onClick={() => setSelected(item)}
              className="mt-3 w-full bg-brand-green text-white text-sm rounded-md py-2 hover:opacity-90"
            >
              Request
            </button>
          </div>
        ))}
        {!isLoading && equipment?.results.length === 0 && (
          <p className="text-sm text-gray-400 col-span-2">No equipment available right now.</p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Request {selected.name}</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acreage</label>
            <input
              type="number"
              step="0.1"
              value={acreage}
              onChange={(e) => setAcreage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
              placeholder="e.g. 2.5"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
            />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <button
              onClick={handleBook}
              disabled={isBooking}
              className="w-full bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isBooking ? "Submitting…" : "Submit Request"}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="w-full text-center text-sm text-gray-500 mt-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">My Requests</h3>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y">
          {bookings?.results.map((b) => (
            <div key={b.id} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  {b.acreage} acres — {b.requested_date}
                  {b.total_cost_ghs && <span className="text-gray-400"> · GHS {b.total_cost_ghs}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                    {b.status.replace("_", " ")}
                  </span>
                  {(b.status === "confirmed" || b.status === "requested") && b.total_cost_ghs && (
                    <button
                      onClick={() => handlePay(b)}
                      disabled={payingBookingId === b.id}
                      className="text-xs font-medium text-brand-green hover:underline disabled:opacity-50"
                    >
                      {payingBookingId === b.id ? "Starting…" : "Pay via MoMo"}
                    </button>
                  )}
                </div>
              </div>
              {paymentMessage[b.id] && (
                <p className="text-xs text-gray-500 mt-1">{paymentMessage[b.id]}</p>
              )}
            </div>
          ))}
          {bookings?.results.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No requests yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
