import { useState, useMemo } from "react";
import { Plus, Tractor } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import type { Paginated, Equipment, User } from "../../types";

const CATEGORIES: Equipment["category"][] = ["ploughing", "planting", "harvesting", "spraying", "transport"];

export default function AdminEquipment() {
  const { data: equipment, isLoading, refetch } = useFetch<Paginated<Equipment>>("/equipment/equipment/");
  const { data: dealers } = useFetch<Paginated<User>>("/accounts/users/?role=dealer");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filteredEquipment = useMemo(() => {
    if (!equipment?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return equipment.results;
    return equipment.results.filter(
      (e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    );
  }, [equipment, search]);
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const [formOpen, setFormOpen] = useState(false);
  const [dealerId, setDealerId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Equipment["category"]>("ploughing");
  const [rate, setRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const openItem = equipment?.results.find((e) => e.id === openItemId) ?? null;
  const openItemDealer = dealers?.results.find((d) => d.id === openItem?.dealer);

  async function toggleAvailable(item: Equipment) {
    setBusyId(item.id);
    try {
      await apiClient.patch(`/equipment/equipment/${item.id}/`, { is_available: !item.is_available });
      toast.success(item.is_available ? `${item.name} paused` : `${item.name} reactivated`);
      refetch();
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
      setOpenItemId(null);
      refetch();
    } catch {
      toast.error("Couldn't delete this listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateOnBehalf() {
    setError("");
    if (!dealerId) {
      setError("Choose which dealer this listing is for.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/equipment/", {
        dealer: Number(dealerId),
        name,
        category,
        rate_per_acre_ghs: parseFloat(rate),
      });
      toast.success(`Listed "${name}" on behalf of the dealer`);
      setFormOpen(false);
      setDealerId("");
      setName("");
      setCategory("ploughing");
      setRate("");
      refetch();
    } catch {
      setError("Couldn't create this listing. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function actionsFor(item: Equipment): DetailAction[] {
    return [
      {
        label: item.is_available ? "Pause Listing" : "Reactivate Listing",
        variant: "secondary",
        onClick: () => toggleAvailable(item),
      },
      { label: "Delete", variant: "danger", onClick: () => deleteEquipment(item) },
    ];
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Equipment</h1>
          <p className="text-page-subtitle">All equipment listed across every dealer</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90"
        >
          <Plus size={16} />
          List on Behalf of a Dealer
        </button>
      </div>

      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search equipment…" className="max-w-xs" />
      </div>

      {formOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold mb-3">List Equipment on Behalf of a Dealer</h3>
          <p className="text-xs text-gray-500 mb-4">
            For dealers who can't list equipment themselves — the entry appears under their account as normal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dealer</label>
              <select
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select a dealer…</option>
                {dealers?.results.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name} (@{d.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Massey Ferguson Tractor"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Equipment["category"])}
                className="w-full border border-gray-300 rounded-md px-3 py-2 capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate (GHS/acre)</label>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
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
              {isSubmitting ? "Listing…" : "List Equipment"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredEquipment.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Equipment</th>
                  <th className="text-left px-5 py-3 font-medium">Category</th>
                  <th className="text-left px-5 py-3 font-medium">Rate</th>
                  <th className="text-left px-5 py-3 font-medium">Dealer ID</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEquipment.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setOpenItemId(item.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${busyId === item.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{item.category}</td>
                    <td className="px-5 py-3 text-gray-600">GHS {item.rate_per_acre_ghs}/acre</td>
                    <td className="px-5 py-3 text-gray-500">#{item.dealer}</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={item.is_available ? "Available" : "Paused"}
                        tone={item.is_available ? "success" : "neutral"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !isLoading ? (
          <EmptyState
            icon={Tractor}
            title={search ? "No equipment matches your search" : "No equipment listed yet"}
            description={search ? undefined : "Dealer listings will appear here."}
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>

      <DetailModal
        isOpen={openItem !== null}
        onClose={() => setOpenItemId(null)}
        title={openItem?.name ?? ""}
        status={openItem ? (openItem.is_available ? "Available" : "Paused") : undefined}
        isBusy={busyId === openItem?.id}
        fields={
          openItem
            ? [
                { label: "Category", value: openItem.category },
                { label: "Rate", value: `GHS ${openItem.rate_per_acre_ghs}/acre` },
                { label: "Dealer", value: openItemDealer ? `${openItemDealer.first_name} ${openItemDealer.last_name}` : `#${openItem.dealer}` },
                ...(openItem.description ? [{ label: "Description", value: openItem.description }] : []),
              ]
            : []
        }
        actions={openItem ? actionsFor(openItem) : []}
      />
    </div>
  );
}
