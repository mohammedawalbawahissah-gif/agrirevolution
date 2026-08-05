import { useState } from "react";
import { Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, Equipment } from "../../types";

export default function AdminEquipment() {
  const { data: equipment, isLoading, refetch } = useFetch<Paginated<Equipment>>("/equipment/equipment/");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggleAvailable(item: Equipment) {
    setBusyId(item.id);
    try {
      await apiClient.patch(`/equipment/equipment/${item.id}/`, { is_available: !item.is_available });
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEquipment(item: Equipment) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await apiClient.delete(`/equipment/equipment/${item.id}/`);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-sm text-gray-500 mt-1">All equipment listed across every dealer</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
            {equipment?.results.map((item) => (
              <tr key={item.id} className={busyId === item.id ? "opacity-50" : ""}>
                <td className="px-5 py-3 font-medium">{item.name}</td>
                <td className="px-5 py-3 text-gray-600 capitalize">{item.category}</td>
                <td className="px-5 py-3 text-gray-600">GHS {item.rate_per_acre_ghs}/acre</td>
                <td className="px-5 py-3 text-gray-500">#{item.dealer}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      item.is_available ? "bg-green-50 text-brand-green" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.is_available ? "Available" : "Paused"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggleAvailable(item)}
                      disabled={busyId === item.id}
                      className="text-gray-400 hover:text-brand-green"
                      title={item.is_available ? "Pause listing" : "Reactivate listing"}
                    >
                      {item.is_available ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                    </button>
                    <button
                      onClick={() => deleteEquipment(item)}
                      disabled={busyId === item.id}
                      className="text-gray-400 hover:text-red-600"
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
        {!isLoading && equipment?.results.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No equipment listed yet.</p>
        )}
        {isLoading && <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>}
      </div>
    </div>
  );
}
