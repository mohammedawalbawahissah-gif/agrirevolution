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
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiClient } from "../../api/client";
import type { Paginated, Equipment, EquipmentBooking } from "../../types";

const CATEGORIES = ["ploughing", "planting", "harvesting", "spraying", "transport"] as const;

export default function EquipmentManageScreen() {
  const { user } = useAuth();
  const {
    data: equipment,
    isLoading,
    refetch,
  } = useFetch<Paginated<Equipment>>(user ? `/equipment/equipment/?dealer=${user.id}` : null, [user?.id]);

  const equipmentIds = equipment?.results.map((e) => e.id) ?? [];
  const { data: bookings } = useFetch<Paginated<EquipmentBooking>>(
    user ? "/equipment/bookings/" : null,
    [user?.id, equipment?.count]
  );
  const myBookings = bookings?.results.filter((b) => equipmentIds.includes(b.equipment)) ?? [];

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "ploughing" as (typeof CATEGORIES)[number],
    rate_per_acre_ghs: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAddEquipment() {
    if (!user) return;
    setError("");
    setIsSubmitting(true);
    try {
      await apiClient.post("/equipment/equipment/", {
        ...form,
        rate_per_acre_ghs: parseFloat(form.rate_per_acre_ghs),
        dealer: user.id,
      });
      setForm({ name: "", category: "ploughing", rate_per_acre_ghs: "", description: "" });
      setModalVisible(false);
      refetch();
    } catch {
      setError("Could not add equipment. Check the form and try again.");
    } finally {
      setIsSubmitting(false);
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
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
            <Text style={styles.cardRate}>GHS {item.rate_per_acre_ghs} / acre</Text>
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
            {myBookings.map((b) => (
              <View key={b.id} style={styles.bookingRow}>
                <Text style={styles.bookingText}>
                  {b.acreage} acres — {b.requested_date}
                </Text>
                <Text style={styles.bookingStatus}>{b.status.replace("_", " ")}</Text>
              </View>
            ))}
            {myBookings.length === 0 && <Text style={styles.emptyText}>No bookings yet.</Text>}
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
              keyboardType="decimal-pad"
              value={form.rate_per_acre_ghs}
              onChangeText={(v) => setForm({ ...form, rate_per_acre_ghs: v })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitButton} onPress={handleAddEquipment} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Add Equipment</Text>}
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardName: { fontSize: 16, fontWeight: "600" },
  cardCategory: { fontSize: 13, color: "#6B7280", marginTop: 2, textTransform: "capitalize" },
  cardRate: { fontSize: 14, fontWeight: "600", color: "#2F6B3C", marginTop: 6 },
  empty: { paddingTop: 20, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14 },
  bookingsSection: { marginTop: 16 },
  bookingsTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  bookingText: { fontSize: 13 },
  bookingStatus: { fontSize: 12, color: "#6B7280", textTransform: "capitalize" },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#2F6B3C",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipActive: { backgroundColor: "#2F6B3C", borderColor: "#2F6B3C" },
  categoryChipText: { fontSize: 12, color: "#374151", textTransform: "capitalize" },
  categoryChipTextActive: { color: "#fff" },
  error: { color: "#DC2626", fontSize: 13, marginBottom: 8 },
  submitButton: { backgroundColor: "#2F6B3C", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, fontSize: 14 },
});
