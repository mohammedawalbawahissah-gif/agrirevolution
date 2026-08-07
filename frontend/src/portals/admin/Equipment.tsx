import { useState } from "react";
import { Trash2, PauseCircle, PlayCircle, Tractor } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import type { Paginated, Equipment } from "../../types";

export default function AdminEquipment() {
  const { data: equipment, isLoading, refetch } = useFetch<Paginated<Equipment>>("/equipment/equipment/");
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

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
      refetch();
    } catch {
      toast.error("Couldn't delete this listing.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-page-title">Equipment</h1>
        <p className="text-page-subtitle">All equipment listed across every dealer</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {equipment?.results.length ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Equipment</th>
                <th className="text-left px-5 py-3 font-medium">Category</th>
                <th className="text-left px-5 py-3 font-medium">Rate</th>
                <th className="text-left px-5 py-3 font-medium">Dealer ID</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {equipment.results.map((item) => (
                <tr key={item.id} className={busyId === item.id ? "opacity-50" : ""}>
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
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleAvailable(item)}
                        disabled={busyId === item.id}
                        className="text-gray-400 hover:text-brand-green transition-colors"
                        title={item.is_available ? "Pause listing" : "Reactivate listing"}
                      >
                        {item.is_available ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                      </button>
                      <button
                        onClick={() => deleteEquipment(item)}
                        disabled={busyId === item.id}
                        className="text-gray-400 hover:text-status-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !isLoading ? (
          <EmptyState icon={Tractor} title="No equipment listed yet" description="Dealer listings will appear here." />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
