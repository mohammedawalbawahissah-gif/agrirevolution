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
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { apiClient } from "../api/client";
import type { Paginated, Equipment, EquipmentBooking } from "../types";

export default function EquipmentScreen() {
  const { user } = useAuth();
  const {
    data: equipment,
    isLoading,
    refetch,
  } = useFetch<Paginated<Equipment>>("/equipment/equipment/?is_available=true");
  const { data: bookings, refetch: refetchBookings } = useFetch<Paginated<EquipmentBooking>>(
    user ? `/equipment/bookings/?farmer=${user.id}` : null,
    [user?.id]
  );

  const [selected, setSelected] = useState<Equipment | null>(null);
  const [acreage, setAcreage] = useState("");
  const [date, setDate] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");

  async function handleBook() {
    if (!selected || !user) return;
    setError("");
    setIsBooking(true);
    try {
      await apiClient.post("/equipment/bookings/", {
        farmer: user.id,
        equipment: selected.id,
        requested_date: date,
        acreage: parseFloat(acreage),
        requested_via: "app",
      });
      setSelected(null);
      setAcreage("");
      setDate("");
      refetchBookings();
    } catch {
      setError("Could not submit request. Check the date format (YYYY-MM-DD) and try again.");
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipment</Text>
        <Text style={styles.subtitle}>Request mechanized equipment, pay per use via MoMo</Text>
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
            <TouchableOpacity style={styles.bookButton} onPress={() => setSelected(item)}>
              <Text style={styles.bookButtonText}>Request</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No equipment available right now.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          bookings && bookings.results.length > 0 ? (
            <View style={styles.bookingsSection}>
              <Text style={styles.bookingsTitle}>My Requests</Text>
              {bookings.results.map((b) => (
                <View key={b.id} style={styles.bookingRow}>
                  <Text style={styles.bookingText}>
                    {b.acreage} acres — {b.requested_date}
                  </Text>
                  <Text style={styles.bookingStatus}>{b.status.replace("_", " ")}</Text>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request {selected?.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Acreage (e.g. 2.5)"
              keyboardType="decimal-pad"
              value={acreage}
              onChangeText={setAcreage}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.bookButton} onPress={handleBook} disabled={isBooking}>
              {isBooking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookButtonText}>Submit Request</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelected(null)}>
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
  list: { paddingHorizontal: 20, paddingBottom: 24 },
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
  bookButton: {
    backgroundColor: "#2F6B3C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  bookButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  empty: { paddingTop: 60, paddingHorizontal: 12 },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14 },
  bookingsSection: { marginTop: 8 },
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
  error: { color: "#DC2626", fontSize: 13, marginBottom: 8 },
  cancelText: { textAlign: "center", color: "#6B7280", marginTop: 12, fontSize: 14 },
});
