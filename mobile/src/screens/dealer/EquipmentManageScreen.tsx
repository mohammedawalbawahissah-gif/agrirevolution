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
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import { colors, radius } from "../../theme/tokens";
import type { Paginated, Equipment, EquipmentBooking } from "../../types";

const CATEGORIES = ["ploughing", "planting", "harvesting", "spraying", "transport"] as const;
const BOOKING_STATUSES: EquipmentBooking["status"][] = [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

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

  async function handleAddEquipment() {
    if (!user) return;
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/equipment/", {
        ...form,
        rate_per_acre_ghs: parseFloat(form.rate_per_acre_ghs),
      });
      toast.success(`${form.name} added`);
      setForm({ name: "", category: "ploughing", rate_per_acre_ghs: "", description: "" });
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

  function cycleBookingStatus(booking: EquipmentBooking) {
    const idx = BOOKING_STATUSES.indexOf(booking.status);
    const next = BOOKING_STATUSES[(idx + 1) % BOOKING_STATUSES.length];
    updateBookingStatus(booking, next);
  }

  async function updateBookingStatus(booking: EquipmentBooking, status: EquipmentBooking["status"]) {
    setBusyId(booking.id);
    try {
      await apiClient.patch(`/equipment/bookings/${booking.id}/`, { status });
      toast.success(`Booking #${booking.id} marked ${status.replace("_", " ")}`);
      refetchBookings();
    } catch {
      toast.error("Couldn't update this booking.");
    } finally {
      setBusyId(null);
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
                onPress={() => cycleBookingStatus(b)}
                disabled={busyId === b.id}
              >
                <Text style={styles.bookingText}>
                  {b.acreage} acres — {b.requested_date}
                </Text>
                <StatusBadge status={b.status} />
              </TouchableOpacity>
            ))}
            {bookings?.results.length === 0 && <Text style={styles.emptyText}>No bookings yet.</Text>}
          </View>
        }
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Add Equipment" onPress={handleAddEquipment} isLoading={isSubmitting} />
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
  cancelText: { textAlign: "center", color: colors.textSecondary, marginTop: 12, fontSize: 14 },
});
