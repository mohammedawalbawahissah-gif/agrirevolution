import { useState, useMemo, type FormEvent } from "react";
import { Trash2, PauseCircle, PlayCircle, Pencil, Package, X } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import { INPUT_CATEGORY_LABELS } from "../../types";
import type { Paginated, InputProduct } from "../../types";

const CATEGORIES = Object.keys(INPUT_CATEGORY_LABELS) as InputProduct["category"][];
const inputClass = "w-full border border-gray-300 rounded-md px-3 py-2";

export default function InputDealerProducts() {
  const { user } = useAuth();
  const { data: products, isLoading, refetch } = useFetch<Paginated<InputProduct>>(
    user ? `/inputs/products/?dealer=${user.id}` : null,
    [user?.id]
  );
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "seeds" as InputProduct["category"],
    unit: "",
    price_ghs: "",
    stock_quantity: "",
    description: "",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editingItem, setEditingItem] = useState<InputProduct | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "seeds" as InputProduct["category"],
    unit: "",
    price_ghs: "",
    stock_quantity: "",
    description: "",
  });
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [editUploadError, setEditUploadError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const filtered = useMemo(() => {
    if (!products?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products.results;
    return products.results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        INPUT_CATEGORY_LABELS[p.category].toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
    );
  }, [products, search]);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/inputs/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoUrl(data.url);
    } catch {
      setUploadError("Upload failed. Please try a different photo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAddProduct(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/inputs/products/", {
        ...form,
        price_ghs: parseFloat(form.price_ghs),
        stock_quantity: parseInt(form.stock_quantity, 10),
        photo_url: photoUrl || undefined,
      });
      toast.success(`${form.name} added`);
      setForm({ name: "", category: "seeds", unit: "", price_ghs: "", stock_quantity: "", description: "" });
      setPhotoUrl("");
      refetch();
    } catch {
      setError("Could not add product. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(item: InputProduct) {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      price_ghs: item.price_ghs,
      stock_quantity: String(item.stock_quantity),
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
      const { data } = await apiClient.post("/inputs/upload-media/", formData, {
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
      await apiClient.patch(`/inputs/products/${editingItem.id}/`, {
        ...editForm,
        price_ghs: parseFloat(editForm.price_ghs),
        stock_quantity: parseInt(editForm.stock_quantity, 10),
        photo_url: editPhotoUrl || undefined,
      });
      toast.success(`${editForm.name} updated`);
      setEditingItem(null);
      refetch();
    } catch {
      setEditError("Could not save changes. Check the form and try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleActive(item: InputProduct) {
    setBusyId(item.id);
    try {
      await apiClient.patch(`/inputs/products/${item.id}/`, { is_active: !item.is_active });
      toast.success(item.is_active ? `${item.name} paused` : `${item.name} reactivated`);
      refetch();
    } catch {
      toast.error("Couldn't update this product.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(item: InputProduct) {
    const ok = await confirm({
      title: `Delete "${item.name}"?`,
      description: "This permanently removes the listing and cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await apiClient.delete(`/inputs/products/${item.id}/`);
      toast.success(`${item.name} deleted`);
      refetch();
    } catch {
      toast.error("Couldn't delete this product.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-page-title">Products</h1>
        <p className="text-page-subtitle">List and manage the farm inputs you stock</p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold mb-3">List New Product</h3>
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Urea Fertilizer" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InputProduct["category"] })} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {INPUT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. 50kg bag" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (GHS)</label>
            <input required type="number" step="0.01" value={form.price_ghs} onChange={(e) => setForm({ ...form, price_ghs: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock quantity</label>
            <input required type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {photoUrl ? (
              <div className="flex items-center gap-3 border border-gray-300 rounded-md px-3 py-2">
                <img src={photoUrl} className="w-14 h-14 object-cover rounded" alt="" />
                <p className="text-xs text-gray-500 flex-1">Photo attached</p>
                <button type="button" onClick={() => setPhotoUrl("")} className="text-xs text-status-danger font-medium">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                  disabled={isUploading}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-brand-green-light file:text-brand-green file:text-xs"
                />
                {isUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                {uploadError && <p className="text-xs text-status-danger mt-1">{uploadError}</p>}
              </>
            )}
          </div>
          {error && <p className="text-sm text-status-danger md:col-span-2">{error}</p>}
          <Button type="submit" isLoading={isSubmitting || isUploading} className="md:col-span-2">
            {isSubmitting ? "Adding..." : "Add Product"}
          </Button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="font-semibold">My Products</h3>
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="w-56" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {filtered.length ? (
            filtered.map((p) => (
              <div key={p.id} className={`px-5 py-3 flex items-center justify-between text-sm ${busyId === p.id ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  {p.photo_url && <img src={p.photo_url} className="w-10 h-10 object-cover rounded" alt="" />}
                  <div>
                    <span className="font-medium text-gray-900">{p.name}</span>{" "}
                    <span className="text-gray-400">— {INPUT_CATEGORY_LABELS[p.category]}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-500 text-xs">
                        GHS {p.price_ghs}/{p.unit} · {p.stock_quantity} in stock
                      </span>
                      <StatusBadge status={p.is_active ? "Active" : "Paused"} tone={p.is_active ? "success" : "neutral"} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(p)} disabled={busyId === p.id} className="text-gray-400 hover:text-brand-green transition-colors" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => toggleActive(p)} disabled={busyId === p.id} className="text-gray-400 hover:text-brand-green transition-colors" title={p.is_active ? "Pause" : "Reactivate"}>
                    {p.is_active ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                  </button>
                  <button onClick={() => deleteProduct(p)} disabled={busyId === p.id} className="text-gray-400 hover:text-status-danger transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Package}
              title={search ? "No products match your search" : "No products listed yet"}
              description={search ? undefined : "Add your first product above."}
            />
          )}
        </div>
      </section>

      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold">Edit Product</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product name</label>
                <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value as InputProduct["category"] })} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {INPUT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input required value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (GHS)</label>
                <input required type="number" step="0.01" value={editForm.price_ghs} onChange={(e) => setEditForm({ ...editForm, price_ghs: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock quantity</label>
                <input required type="number" value={editForm.stock_quantity} onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                {editPhotoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={editPhotoUrl} alt="Product preview" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
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
