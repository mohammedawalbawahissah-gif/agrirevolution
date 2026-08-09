import { useState } from "react";
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
import DetailModal, { type DetailAction, type DetailField } from "../../components/ui/DetailModal";
import { colors, radius } from "../../theme/tokens";
import type { Paginated, Equipment, EquipmentBooking } from "../../types";

const CATEGORIES = ["ploughing", "planting", "harvesting", "spraying", "transport"] as const;

export default function EquipmentManageScreen() {
  const { user } = useAuth();
  const {
    data: equipment,
    isLoading,
    refetch,
  } = useFetch<Paginated<Equipment>>(user ? `/equipment/equipment/?dealer=${user.id}` : null, [user?.id]);

  // Backend already scopes /equipment/bookings/ to this dealer's own equipment.
  const { data: bookings, refetch: refetchBookings } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id]
  );
  const toast = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "ploughing" as (typeof CATEGORIES)[number],
    rate_per_acre_ghs: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [openBookingId, setOpenBookingId] = useState<number | null>(null);

  const openBooking = bookings?.results.find((b) => b.id === openBookingId) ?? null;

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
      const { data } = await apiClient.post("/equipment/upload-media/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoUrl(data.url);
    } catch {
      setError("Upload failed. Please try a different photo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAddEquipment() {
    if (!user) return;
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
      setModalVisible(false);
      refetch();
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
      refetch();
    } catch {
      toast.error("Couldn't update this listing.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(item: Equipment) {
    Alert.alert("Delete equipment", `Delete "${item.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEquipment(item) },
    ]);
  }

  async function deleteEquipment(item: Equipment) {
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

  async function updateBookingStatus(booking: EquipmentBooking, status: EquipmentBooking["status"]) {
    setBusyId(booking.id);
    try {
      await apiClient.patch(`/equipment/bookings/${booking.id}/`, { status });
      toast.success(`Booking #${booking.id} marked ${status.replace("_", " ")}`);
      setOpenBookingId(null);
      refetchBookings();
    } catch {
      toast.error("Couldn't update this booking.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmCancelBooking(booking: EquipmentBooking) {
    Alert.alert("Cancel booking", `Cancel ${booking.farmer_name ?? "this farmer"}'s booking? This can't be undone.`, [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: () => updateBookingStatus(booking, "cancelled") },
    ]);
  }

  function bookingFields(b: EquipmentBooking): DetailField[] {
    return [
      { label: "Equipment", value: b.equipment_name ?? `#${b.equipment}` },
      { label: "Farmer", value: b.farmer_name ?? `#${b.farmer}` },
      { label: "Acreage", value: `${b.acreage} acres` },
      { label: "Date", value: b.requested_date },
      { label: "Cost", value: b.total_cost_ghs ? `GHS ${b.total_cost_ghs}` : "—" },
      { label: "Delivery", value: b.delivery_method === "delivery" ? "Deliver to farmer" : "Farmer pickup" },
      ...(b.delivery_method === "delivery" && b.delivery_location ? [{ label: "Location", value: b.delivery_location }] : []),
      { label: "Payment", value: b.payment_channel || "Not specified" },
    ];
  }

  function bookingActions(b: EquipmentBooking): DetailAction[] {
    switch (b.status) {
      case "requested":
        return [
          { label: "Confirm", variant: "primary", onPress: () => updateBookingStatus(b, "confirmed") },
          { label: "Decline", variant: "danger", onPress: () => confirmCancelBooking(b) },
        ];
      case "confirmed":
        return [
          { label: "Start Job", variant: "primary", onPress: () => updateBookingStatus(b, "in_progress") },
          { label: "Cancel", variant: "danger", onPress: () => confirmCancelBooking(b) },
        ];
      case "in_progress":
        return [{ label: "Mark Completed", variant: "primary", onPress: () => updateBookingStatus(b, "completed") }];
      default:
        return [];
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Equipment</Text>
        <Text style={styles.subtitle}>Manage your listings and incoming bookings</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={equipment?.results ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View style={[styles.card, busyId === item.id && styles.cardBusy]}>
            <View style={styles.cardHeaderRow}>
              {item.photo_url && <Image source={{ uri: item.photo_url }} style={styles.cardThumb} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardRate}>GHS {item.rate_per_acre_ghs} / acre</Text>
                  <StatusBadge status={item.is_available ? "Available" : "Paused"} />
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => toggleAvailable(item)} disabled={busyId === item.id}>
                  <Text style={styles.actionLink}>{item.is_available ? "Pause" : "Activate"}</Text>
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
              <Text style={styles.emptyText}>No equipment listed yet. Tap below to add one.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.bookingsSection}>
            <Text style={styles.bookingsTitle}>Incoming Bookings</Text>
            {bookings?.results.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingRow}
                onPress={() => setOpenBookingId(b.id)}
                disabled={busyId === b.id}
              >
                <Text style={styles.bookingText}>
                  {b.equipment_name ?? "Booking"} — {b.farmer_name ?? `#${b.farmer}`} · {b.acreage} acres on {b.requested_date}
                </Text>
                <StatusBadge status={b.status} />
              </TouchableOpacity>
            ))}
            {bookings?.results.length === 0 && <Text style={styles.emptyText}>No bookings yet.</Text>}
          </View>
        }
      />

      <DetailModal
        isOpen={openBooking !== null}
        onClose={() => setOpenBookingId(null)}
        title={openBooking?.equipment_name ?? `Booking #${openBooking?.id ?? ""}`}
        status={openBooking?.status}
        isBusy={busyId === openBooking?.id}
        fields={openBooking ? bookingFields(openBooking) : []}
        actions={openBooking ? bookingActions(openBooking) : []}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ List Equipment</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>List New Equipment</Text>
            <TextInput
              style={styles.input}
              placeholder="Equipment name"
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
                  <Text
                    style={[styles.categoryChipText, form.category === c && styles.categoryChipTextActive]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Rate per acre (GHS)"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={form.rate_per_acre_ghs}
              onChangeText={(v) => setForm({ ...form, rate_per_acre_ghs: v })}
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
            <Button title="Add Equipment" onPress={handleAddEquipment} isLoading={isSubmitting || isUploading} />
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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
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
  cardCategory: { fontSize: 13, color: colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  cardRate: { fontSize: 13, fontWeight: "600", color: colors.brandGreen },
  empty: { paddingTop: 20, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
  bookingsSection: { marginTop: 16 },
  bookingsTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 10 },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookingText: { fontSize: 13, color: colors.textPrimary },
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
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24 },
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
  categoryChipText: { fontSize: 12, color: "#374151", textTransform: "capitalize" },
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
