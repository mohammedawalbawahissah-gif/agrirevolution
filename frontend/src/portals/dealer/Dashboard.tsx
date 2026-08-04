import { useState, type FormEvent } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import type { Paginated, Equipment, EquipmentBooking } from "../../types";

const CATEGORIES = ["ploughing", "planting", "harvesting", "spraying", "transport"] as const;

export default function DealerDashboard() {
  const { user, logout } = useAuth();
  const {
    data: equipment,
    isLoading: equipmentLoading,
    refetch: refetchEquipment,
  } = useFetch<Paginated<Equipment>>(user ? `/equipment/equipment/?dealer=${user.id}` : null, [user?.id]);

  const equipmentIds = equipment?.results.map((e) => e.id) ?? [];
  const { data: bookings } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id, equipment?.count]
  );
  const myBookings = bookings?.results.filter((b) => equipmentIds.includes(b.equipment)) ?? [];

  const [form, setForm] = useState({
    name: "",
    category: "ploughing" as (typeof CATEGORIES)[number],
    rate_per_acre_ghs: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAddEquipment(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/equipment/", {
        ...form,
        rate_per_acre_ghs: parseFloat(form.rate_per_acre_ghs),
        dealer: user?.id,
      });
      setForm({ name: "", category: "ploughing", rate_per_acre_ghs: "", description: "" });
      refetchEquipment();
    } catch {
      setError("Could not add equipment. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dealer Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.first_name || user?.username}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
          Sign out
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-8">
        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold mb-4">List New Equipment</h2>
          <form onSubmit={handleAddEquipment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g. Massey Ferguson Plough"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate per acre (GHS)</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.rate_per_acre_ghs}
                onChange={(e) => setForm({ ...form, rate_per_acre_ghs: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="md:col-span-2 bg-brand-green text-white rounded-md py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Equipment"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">My Equipment</h2>
          </div>
          <div className="divide-y">
            {equipmentLoading && <p className="px-5 py-4 text-sm text-gray-400">Loading...</p>}
            {equipment?.results.map((eq) => (
              <div key={eq.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>
                  {eq.name} <span className="text-gray-400">— {eq.category}</span>
                </span>
                <span className="font-medium">GHS {eq.rate_per_acre_ghs}/acre</span>
              </div>
            ))}
            {equipment?.results.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No equipment listed yet — add one above.</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Incoming Bookings</h2>
          </div>
          <div className="divide-y">
            {myBookings.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>Booking #{b.id} — {b.acreage} acres on {b.requested_date}</span>
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                  {b.status.replace("_", " ")}
                </span>
              </div>
            ))}
            {myBookings.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No bookings yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
