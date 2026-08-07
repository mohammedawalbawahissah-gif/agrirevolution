import { useState, type FormEvent } from "react";
import { Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import type { Paginated, Equipment } from "../../types";

const CATEGORIES = ["ploughing", "planting", "harvesting", "spraying", "transport"] as const;

export default function DealerEquipment() {
  const { user } = useAuth();
  const {
    data: equipment,
    isLoading: equipmentLoading,
    refetch: refetchEquipment,
  } = useFetch<Paginated<Equipment>>(user ? `/equipment/equipment/?dealer=${user.id}` : null, [user?.id]);

  const [form, setForm] = useState({
    name: "",
    category: "ploughing" as (typeof CATEGORIES)[number],
    rate_per_acre_ghs: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleAddEquipment(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/equipment/", {
        ...form,
        rate_per_acre_ghs: parseFloat(form.rate_per_acre_ghs),
      });
      setForm({ name: "", category: "ploughing", rate_per_acre_ghs: "", description: "" });
      refetchEquipment();
    } catch {
      setError("Could not add equipment. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleAvailable(item: Equipment) {
    setBusyId(item.id);
    try {
      await apiClient.patch(`/equipment/equipment/${item.id}/`, { is_available: !item.is_available });
      refetchEquipment();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEquipment(item: Equipment) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await apiClient.delete(`/equipment/equipment/${item.id}/`);
      refetchEquipment();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-sm text-gray-500 mt-1">List and manage your mechanization equipment</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
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

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">My Equipment</h2>
        </div>
        <div className="divide-y">
          {equipmentLoading && <p className="px-5 py-4 text-sm text-gray-400">Loading...</p>}
          {equipment?.results.map((eq) => (
            <div
              key={eq.id}
              className={`px-5 py-3 flex items-center justify-between text-sm ${busyId === eq.id ? "opacity-50" : ""}`}
            >
              <div>
                <span className="font-medium">{eq.name}</span> <span className="text-gray-400">— {eq.category}</span>
                <p className="text-gray-500 text-xs mt-0.5">
                  GHS {eq.rate_per_acre_ghs}/acre ·{" "}
                  <span className={eq.is_available ? "text-brand-green" : "text-gray-400"}>
                    {eq.is_available ? "Available" : "Paused"}
                  </span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => toggleAvailable(eq)}
                  disabled={busyId === eq.id}
                  className="text-gray-400 hover:text-brand-green"
                  title={eq.is_available ? "Pause listing" : "Reactivate listing"}
                >
                  {eq.is_available ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                </button>
                <button
                  onClick={() => deleteEquipment(eq)}
                  disabled={busyId === eq.id}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {equipment?.results.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No equipment listed yet — add one above.</p>
          )}
        </div>
      </section>
    </div>
  );
}
