import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import { colors, radius } from "../../theme/tokens";
import { INPUT_CATEGORY_LABELS } from "../../types";
import type { Paginated, InputProduct } from "../../types";

const CATEGORIES = Object.keys(INPUT_CATEGORY_LABELS) as InputProduct["category"][];

export default function InputProductsScreen() {
  const { user } = useAuth();
  const {
    data: products,
    isLoading,
    refetch,
  } = useFetch<Paginated<InputProduct>>(user ? `/inputs/products/?dealer=${user.id}` : null, [user?.id]);
  const toast = useToast();

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!products?.results) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products.results;
    return products.results.filter(
      (p) => p.name.toLowerCase().includes(q) || INPUT_CATEGORY_LABELS[p.category].toLowerCase().includes(q)
    );
  }, [products, search]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InputProduct | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "seeds" as InputProduct["category"],
    unit: "",
    price_ghs: "",
    stock_quantity: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isEditing = editingItem !== null;

  function openCreateModal() {
    setEditingItem(null);
    setForm({ name: "", category: "seeds", unit: "", price_ghs: "", stock_quantity: "", description: "" });
    setPhotoUrl("");
    setError("");
    setModalVisible(true);
  }

  function openEditModal(item: InputProduct) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      price_ghs: item.price_ghs,
      stock_quantity: String(item.stock_quantity),
      description: item.description,
    });
    setPhotoUrl(item.photo_url);
    setError("");
    setModalVisible(true);
  }

  async function handlePickPhoto() {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is needed to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const formData = new FormData();
      // @ts-expect-error React Native's FormData file shape isn't the DOM File type
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || "upload.jpg",
        type: asset.mimeType || "image/jpeg",
      });
      const { data } = await apiClient.post("/inputs/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoUrl(data.url);
    } catch {
      setError("Upload failed. Please try a different photo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveProduct() {
    if (!user) return;
    setError("");
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        price_ghs: parseFloat(form.price_ghs),
        stock_quantity: parseInt(form.stock_quantity, 10),
        photo_url: photoUrl || undefined,
      };
      if (isEditing && editingItem) {
        await apiClient.patch(`/inputs/products/${editingItem.id}/`, payload);
        toast.success(`${form.name} updated`);
      } else {
        await apiClient.post("/inputs/products/", payload);
        toast.success(`${form.name} added`);
      }
      setModalVisible(false);
      refetch();
    } catch {
      setError(isEditing ? "Could not save changes." : "Could not add product. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
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

  function confirmDelete(item: InputProduct) {
    Alert.alert("Delete product", `Delete "${item.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteProduct(item) },
    ]);
  }

  async function deleteProduct(item: InputProduct) {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
        <Text style={styles.subtitle}>List and manage the farm inputs you stock</Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search products…" />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View style={[styles.card, busyId === item.id && styles.cardBusy]}>
            <View style={styles.cardHeaderRow}>
              {item.photo_url && <Image source={{ uri: item.photo_url }} style={styles.cardThumb} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCategory}>{INPUT_CATEGORY_LABELS[item.category]}</Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardRate}>
                    GHS {item.price_ghs}/{item.unit} · {item.stock_quantity} in stock
                  </Text>
                  <StatusBadge status={item.is_active ? "Active" : "Paused"} />
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} disabled={busyId === item.id}>
                  <Text style={styles.actionLink}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleActive(item)} disabled={busyId === item.id}>
                  <Text style={styles.actionLink}>{item.is_active ? "Pause" : "Activate"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} disabled={busyId === item.id}>
                  <Text style={styles.deleteLink}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? "No products match your search." : "No products listed yet. Tap below to add one."}
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabText}>+ List Product</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? "Edit Product" : "List New Product"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Product name"
              placeholderTextColor={colors.textMuted}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, form.category === c && styles.categoryChipActive]}
                  onPress={() => setForm({ ...form, category: c })}
                >
                  <Text style={[styles.categoryChipText, form.category === c && styles.categoryChipTextActive]}>
                    {INPUT_CATEGORY_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Unit (e.g. 50kg bag)"
              placeholderTextColor={colors.textMuted}
              value={form.unit}
              onChangeText={(v) => setForm({ ...form, unit: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Price (GHS)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={form.price_ghs}
              onChangeText={(v) => setForm({ ...form, price_ghs: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Stock quantity"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={form.stock_quantity}
              onChangeText={(v) => setForm({ ...form, stock_quantity: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />
            {photoUrl ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                <Text style={styles.photoPreviewText}>Photo attached</Text>
                <TouchableOpacity onPress={() => setPhotoUrl("")}>
                  <Text style={styles.deleteLink}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPickButton} onPress={handlePickPhoto} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color={colors.brandGreen} size="small" />
                ) : (
                  <Text style={styles.photoPickButtonText}>📷 Add a photo (optional)</Text>
                )}
              </TouchableOpacity>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title={isEditing ? "Save Changes" : "Add Product"}
              onPress={handleSaveProduct}
              isLoading={isSubmitting || isUploading}
            />
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandCream },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBusy: { opacity: 0.5 },
  cardThumb: { width: 48, height: 48, borderRadius: radius.sm, marginRight: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  cardActions: { alignItems: "flex-end", gap: 8 },
  actionLink: { fontSize: 12, fontWeight: "600", color: colors.brandGreen },
  deleteLink: { fontSize: 12, fontWeight: "600", color: colors.statusDanger },
  cardName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  cardCategory: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  cardRate: { fontSize: 12, fontWeight: "600", color: colors.brandGreen },
  empty: { paddingTop: 20, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.brandGreen,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24, maxHeight: "88%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
  input: {
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipActive: { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
  categoryChipText: { fontSize: 12, color: "#374151" },
  categoryChipTextActive: { color: "#fff" },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: 8 },
  photoPickButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: colors.brandCream,
  },
  photoPickButtonText: { color: colors.brandGreen, fontWeight: "600", fontSize: 13 },
  photoPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 12,
  },
  photoPreview: { width: 40, height: 40, borderRadius: radius.sm },
  photoPreviewText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  cancelText: { textAlign: "center", color: colors.textSecondary, marginTop: 12, fontSize: 14 },
});
