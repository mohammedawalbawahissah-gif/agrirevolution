import { useState, type FormEvent } from "react";
import { Trash2, PauseCircle, PlayCircle, Tractor } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import type { Paginated, Equipment } from "../../types";

const CATEGORIES = ["ploughing", "planting", "harvesting", "spraying", "transport"] as const;
const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent";

export default function DealerEquipment() {
  const { user } = useAuth();
  const {
    data: equipment,
    isLoading: equipmentLoading,
    refetch: refetchEquipment,
  } = useFetch<Paginated<Equipment>>(user ? `/equipment/equipment/?dealer=${user.id}` : null, [user?.id]);
  const toast = useToast();
  const confirm = useConfirm();

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
      toast.success(`${form.name} added`);
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
      toast.success(item.is_available ? `${item.name} paused` : `${item.name} reactivated`);
      refetchEquipment();
    } catch {
      toast.error("Couldn't update this listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEquipment(item: Equipment) {
    const ok = await confirm({
      title: `Delete "${item.name}"?`,
      description: "This permanently removes the listing and cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    setBusyId(item.id);
    try {
      await apiClient.delete(`/equipment/equipment/${item.id}/`);
      toast.success(`${item.name} deleted`);
      refetchEquipment();
    } catch {
      toast.error("Couldn't delete this listing.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-page-title">Equipment</h1>
        <p className="text-page-subtitle">List and manage your mechanization equipment</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-section-title mb-4">List New Equipment</h2>
        <form onSubmit={handleAddEquipment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="e.g. Massey Ferguson Plough"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
              className={inputClass}
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
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-status-danger md:col-span-2">{error}</p>}
          <Button type="submit" isLoading={isSubmitting} className="md:col-span-2">
            {isSubmitting ? "Adding..." : "Add Equipment"}
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-section-title">My Equipment</h2>
        </div>
        {equipmentLoading ? (
          <p className="px-5 py-4 text-sm text-gray-400">Loading...</p>
        ) : equipment?.results.length ? (
          <div className="divide-y divide-gray-100">
            {equipment.results.map((eq) => (
              <div
                key={eq.id}
                className={`px-5 py-3 flex items-center justify-between text-sm ${busyId === eq.id ? "opacity-50" : ""}`}
              >
                <div>
                  <span className="font-medium text-gray-900">{eq.name}</span>{" "}
                  <span className="text-gray-400">— {eq.category}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-xs">GHS {eq.rate_per_acre_ghs}/acre</span>
                    <StatusBadge
                      status={eq.is_available ? "Available" : "Paused"}
                      tone={eq.is_available ? "success" : "neutral"}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleAvailable(eq)}
                    disabled={busyId === eq.id}
                    className="text-gray-400 hover:text-brand-green transition-colors"
                    title={eq.is_available ? "Pause listing" : "Reactivate listing"}
                  >
                    {eq.is_available ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                  </button>
                  <button
                    onClick={() => deleteEquipment(eq)}
                    disabled={busyId === eq.id}
                    className="text-gray-400 hover:text-status-danger transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Tractor} title="No equipment listed yet" description="Add your first piece of equipment above." />
        )}
      </section>
    </div>
  );
}
