import { useState, type FormEvent } from "react";
import { Trash2, PauseCircle, PlayCircle, Pencil, Tractor, X } from "lucide-react";
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
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "ploughing" as (typeof CATEGORIES)[number],
    rate_per_acre_ghs: "",
    description: "",
  });
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [editUploadError, setEditUploadError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit(item: Equipment) {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      rate_per_acre_ghs: item.rate_per_acre_ghs,
      description: item.description,
    });
    setEditPhotoUrl(item.photo_url);
    setEditError("");
    setEditUploadError("");
  }

  async function handleEditPhotoSelected(file: File | undefined) {
    if (!file) return;
    setEditUploadError("");
    setIsEditUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/equipment/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditPhotoUrl(data.url);
    } catch {
      setEditUploadError("Upload failed. Please try a different photo.");
    } finally {
      setIsEditUploading(false);
    }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setEditError("");
    setIsSavingEdit(true);
    try {
      await apiClient.patch(`/equipment/equipment/${editingItem.id}/`, {
        ...editForm,
        rate_per_acre_ghs: parseFloat(editForm.rate_per_acre_ghs),
        photo_url: editPhotoUrl || undefined,
      });
      toast.success(`${editForm.name} updated`);
      setEditingItem(null);
      refetchEquipment();
    } catch {
      setEditError("Could not save changes. Check the form and try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/equipment/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoUrl(data.url);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Upload failed. Please try a different photo.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAddEquipment(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/equipment/", {
        ...form,
        rate_per_acre_ghs: parseFloat(form.rate_per_acre_ghs),
        photo_url: photoUrl || undefined,
      });
      toast.success(`${form.name} added`);
      setForm({ name: "", category: "ploughing", rate_per_acre_ghs: "", description: "" });
      setPhotoUrl("");
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
            {photoUrl ? (
              <div className="flex items-center gap-3">
                <img src={photoUrl} alt="Equipment preview" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="text-xs text-status-danger hover:underline"
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoSelected(e.target.files?.[0])}
                  disabled={isUploading}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-brand-green-light file:text-brand-green file:text-xs"
                />
                {isUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                {uploadError && <p className="text-xs text-status-danger mt-1">{uploadError}</p>}
              </>
            )}
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
                <div className="flex items-center gap-3">
                  {eq.photo_url && (
                    <img src={eq.photo_url} alt={eq.name} className="w-10 h-10 object-cover rounded-md border border-gray-200 shrink-0" />
                  )}
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
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(eq)}
                    disabled={busyId === eq.id}
                    className="text-gray-400 hover:text-brand-green transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
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

      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold">Edit Equipment</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment name</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as typeof editForm.category })}
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
                  value={editForm.rate_per_acre_ghs}
                  onChange={(e) => setEditForm({ ...editForm, rate_per_acre_ghs: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                {editPhotoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={editPhotoUrl} alt="Equipment preview" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                    <button type="button" onClick={() => setEditPhotoUrl("")} className="text-xs text-status-danger hover:underline">
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleEditPhotoSelected(e.target.files?.[0])}
                      disabled={isEditUploading}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-brand-green-light file:text-brand-green file:text-xs"
                    />
                    {isEditUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                    {editUploadError && <p className="text-xs text-status-danger mt-1">{editUploadError}</p>}
                  </>
                )}
              </div>
              {editError && <p className="text-sm text-status-danger md:col-span-2">{editError}</p>}
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" isLoading={isSavingEdit || isEditUploading}>
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
                <button type="button" onClick={() => setEditingItem(null)} className="text-sm text-gray-500">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
