import { useState, useMemo } from "react";
import { Plus, Package } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import SearchInput from "../../components/ui/SearchInput";
import DetailModal, { type DetailAction } from "../../components/ui/DetailModal";
import { INPUT_CATEGORY_LABELS } from "../../types";
import type { Paginated, InputProduct, User } from "../../types";

const CATEGORIES = Object.keys(INPUT_CATEGORY_LABELS) as InputProduct["category"][];

export default function AdminInputProducts() {
  const { data: products, isLoading, refetch } = useFetch<Paginated<InputProduct>>("/inputs/products/");
  const { data: dealers } = useFetch<Paginated<User>>("/accounts/users/?role=input_dealer");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const toast = useToast();
  const confirm = useConfirm();

  const [formOpen, setFormOpen] = useState(false);
  const [dealerId, setDealerId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InputProduct["category"]>("seeds");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (!products?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products.results;
    return products.results.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.dealer_name ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const openItem = filtered.find((p) => p.id === openItemId) ?? products?.results.find((p) => p.id === openItemId) ?? null;

  async function toggleActive(item: InputProduct) {
    setBusyId(item.id);
    try {
      await apiClient.patch(`/inputs/products/${item.id}/`, { is_active: !item.is_active });
      toast.success(item.is_active ? `${item.name} paused` : `${item.name} reactivated`);
      setOpenItemId(null);
      refetch();
    } catch {
      toast.error("Couldn't update this listing.");
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
      setError("Choose which input dealer this listing is for.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/inputs/products/", {
        dealer: Number(dealerId),
        name,
        category,
        unit,
        price_ghs: parseFloat(price),
        stock_quantity: parseInt(stock, 10),
      });
      toast.success(`Listed ${name} on behalf of the dealer`);
      setFormOpen(false);
      setDealerId("");
      setName("");
      setUnit("");
      setPrice("");
      setStock("");
      refetch();
    } catch {
      setError("Couldn't create this listing. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-page-title">Input Products</h1>
          <p className="text-page-subtitle">Farm inputs listed by every input dealer</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="w-56" />
          <button
            onClick={() => setFormOpen(true)}
            className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} /> On Behalf of a Dealer
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold mb-3">List Product on Behalf of an Input Dealer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Dealer</label>
              <select value={dealerId} onChange={(e) => setDealerId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white">
                <option value="">Select dealer…</option>
                {dealers?.results.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name} (@{d.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as InputProduct["category"])} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {INPUT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 50kg bag" className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (GHS)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock quantity</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
          </div>
          {error && <p className="text-sm text-status-danger mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateOnBehalf}
              disabled={isSubmitting}
              className="bg-brand-green text-white text-sm rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Listing…" : "List Product"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-left px-5 py-3 font-medium">Category</th>
                  <th className="text-left px-5 py-3 font-medium">Price</th>
                  <th className="text-left px-5 py-3 font-medium">Stock</th>
                  <th className="text-left px-5 py-3 font-medium">Dealer</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setOpenItemId(p.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${busyId === p.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">{INPUT_CATEGORY_LABELS[p.category]}</td>
                    <td className="px-5 py-3 text-gray-600">GHS {p.price_ghs}/{p.unit}</td>
                    <td className="px-5 py-3 text-gray-600">{p.stock_quantity}</td>
                    <td className="px-5 py-3 text-gray-500">{p.dealer_name ?? `#${p.dealer}`}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.is_active ? "Active" : "Paused"} tone={p.is_active ? "success" : "neutral"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !isLoading ? (
          <EmptyState
            icon={Package}
            title={search ? "No products match your search" : "No input products listed yet"}
            description={search ? undefined : "Input dealer listings will appear here."}
          />
        ) : (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
        )}
      </div>

      {openItem && (
        <DetailModal
          isOpen={!!openItem}
          onClose={() => setOpenItemId(null)}
          title={openItem.name}
          status={openItem.is_active ? "Active" : "Paused"}
          isBusy={busyId === openItem.id}
          fields={[
            { label: "Category", value: INPUT_CATEGORY_LABELS[openItem.category] },
            { label: "Unit", value: openItem.unit },
            { label: "Price", value: `GHS ${openItem.price_ghs}` },
            { label: "Stock", value: String(openItem.stock_quantity) },
            { label: "Dealer", value: openItem.dealer_name ?? `#${openItem.dealer}` },
            { label: "Description", value: openItem.description || "—" },
          ]}
          actions={
            [
              {
                label: openItem.is_active ? "Pause Listing" : "Reactivate Listing",
                variant: "secondary",
                onClick: () => toggleActive(openItem),
              },
              { label: "Delete", variant: "danger", onClick: () => deleteProduct(openItem) },
            ] as DetailAction[]
          }
        />
      )}
    </div>
  );
}
